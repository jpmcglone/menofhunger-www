import type { Article, ArticleTag } from '~/types/api'
import type { PostVisibility } from '~/types/api'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useArticleEditor(initialArticle: Ref<Article | null>) {
  const { apiFetchData } = useApiClient()

  const article = ref<Article | null>(initialArticle.value ? { ...initialArticle.value } : null)
  const title = ref(initialArticle.value?.title ?? '')
  // Bug 4 fix: default to '' not '{}' — TiptapEditor treats '' as empty doc
  const body = ref(initialArticle.value?.body ?? '')
  const thumbnailUrl = ref(initialArticle.value?.thumbnailUrl ?? null)
  const thumbnailR2Key = ref<string | null>(initialArticle.value?.thumbnailR2Key ?? null)
  // Bug 1 fix: track whether thumbnail was explicitly changed so null means "remove"
  const thumbnailDirty = ref(false)
  const visibility = ref<PostVisibility>(initialArticle.value?.visibility ?? 'public')
  const tags = ref<ArticleTag[]>(initialArticle.value?.tags ?? [])
  const saveStatus = ref<SaveStatus>('idle')
  const lastSavedAt = ref<Date | null>(initialArticle.value?.lastSavedAt ? new Date(initialArticle.value.lastSavedAt) : null)
  const isDirty = ref(false)
  const publishing = ref(false)

  watch(initialArticle, (a) => {
    if (!a) return
    article.value = { ...a }
    if (!isDirty.value) {
      title.value = a.title
      body.value = a.body ?? ''
      visibility.value = a.visibility
      thumbnailUrl.value = a.thumbnailUrl
      thumbnailR2Key.value = a.thumbnailR2Key ?? null
      tags.value = a.tags ?? []
      lastSavedAt.value = a.lastSavedAt ? new Date(a.lastSavedAt) : null
    }
  })

  function isBodyEmpty(raw: string): boolean {
    if (!raw) return true
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function hasText(node: any): boolean {
        if (node.type === 'text') return !!node.text?.trim()
        if (Array.isArray(node.content)) return node.content.some(hasText)
        return false
      }
      return !hasText(JSON.parse(raw))
    } catch {
      return !raw.trim()
    }
  }

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function markDirty() {
    isDirty.value = true
    scheduleAutoSave()
  }

  function scheduleAutoSave(delay = 3000) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => save(), delay)
  }

  async function save() {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null }
    if (!article.value?.id) return
    if (!title.value.trim() && isBodyEmpty(body.value)) return
    saveStatus.value = 'saving'
    try {
      const updated = await apiFetchData<Article>(`/articles/${article.value.id}/save`, {
        method: 'PATCH',
        body: {
          title: title.value,
          body: body.value,
          visibility: visibility.value,
          // Always sync tags so removals propagate.
          tags: tags.value.map((t) => t.label),
          // Bug 1 fix: include thumbnailR2Key when dirty (null = explicit removal)
          ...(thumbnailDirty.value ? { thumbnailR2Key: thumbnailR2Key.value } : {}),
        },
      })
      article.value = updated
      lastSavedAt.value = updated.lastSavedAt ? new Date(updated.lastSavedAt) : new Date()
      isDirty.value = false
      thumbnailDirty.value = false
      saveStatus.value = 'saved'
    } catch {
      saveStatus.value = 'error'
    }
  }

  async function publish() {
    if (!article.value?.id) return null
    if (isDirty.value) await save()
    publishing.value = true
    try {
      const updated = await apiFetchData<Article>(`/articles/${article.value.id}/publish`, { method: 'POST' })
      article.value = updated
      isDirty.value = false
      return updated
    } finally {
      publishing.value = false
    }
  }

  const lastSavedLabel = computed(() => {
    if (!lastSavedAt.value) return null
    return `Saved at ${lastSavedAt.value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  })

  // Bug 3 fix: flush dirty changes on unmount instead of silently dropping them
  onBeforeUnmount(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
    if (isDirty.value && article.value?.id) {
      void save()
    }
  })

  return {
    article,
    title,
    body,
    thumbnailUrl,
    thumbnailR2Key,
    thumbnailDirty,
    visibility,
    tags,
    saveStatus,
    lastSavedAt,
    lastSavedLabel,
    isDirty,
    publishing,
    markDirty,
    save,
    publish,
  }
}
