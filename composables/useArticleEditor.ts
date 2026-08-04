import type { Article, ArticleTag, PostVisibility  } from '~/types/api'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/** Quiet period after the last edit before autosaving. */
const AUTOSAVE_DEBOUNCE_MS = 2000
/** Ceiling on the debounce so sustained typing still checkpoints on a fixed cadence. */
const AUTOSAVE_MAX_WAIT_MS = 10000

type ArticleEditorOptions = {
  /** Called once the draft row is first persisted, so the page can swap `/articles/new` for the edit URL. */
  onCreated?: (article: Article) => void
}

export function useArticleEditor(initialArticle: Ref<Article | null>, options: ArticleEditorOptions = {}) {
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

  /**
   * Anything a reader would perceive as work. The draft row is not created until this
   * is true, so opening the editor and walking away leaves nothing behind.
   */
  const hasContent = computed(
    () =>
      title.value.trim().length > 0
      || !isBodyEmpty(body.value)
      || !!thumbnailR2Key.value
      || tags.value.length > 0,
  )

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let maxWaitTimer: ReturnType<typeof setTimeout> | null = null
  let inFlight: Promise<void> | null = null
  let resaveQueued = false
  let createRequest: Promise<Article | null> | null = null

  function clearTimers() {
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null }
    if (maxWaitTimer) { clearTimeout(maxWaitTimer); maxWaitTimer = null }
  }

  function markDirty() {
    isDirty.value = true
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => void save(), AUTOSAVE_DEBOUNCE_MS)
    if (!maxWaitTimer) maxWaitTimer = setTimeout(() => void save(), AUTOSAVE_MAX_WAIT_MS)
  }

  async function createDraft(): Promise<Article | null> {
    if (article.value?.id) return article.value
    if (!createRequest) {
      createRequest = apiFetchData<Article>('/articles', {
        method: 'POST',
        body: { title: title.value.trim(), visibility: visibility.value },
      })
        .then((created) => {
          article.value = created
          options.onCreated?.(created)
          return created
        })
        .catch(() => {
          // Let the next autosave retry instead of wedging the editor permanently.
          createRequest = null
          return null
        })
    }
    return createRequest
  }

  async function save(): Promise<void> {
    clearTimers()
    // Emptiness gates creation only. Once the row exists every save must go through,
    // otherwise clearing an article back to nothing would never persist.
    if (!article.value?.id && !hasContent.value) {
      isDirty.value = false
      return
    }
    if (inFlight) {
      // Coalesce: fold this call into the running save and re-run once afterwards.
      resaveQueued = true
      return inFlight
    }
    inFlight = runSave()
    try {
      await inFlight
    } finally {
      inFlight = null
      if (resaveQueued) {
        resaveQueued = false
        void save()
      }
    }
  }

  async function runSave(): Promise<void> {
    saveStatus.value = 'saving'
    const target = article.value?.id ? article.value : await createDraft()
    if (!target?.id) {
      saveStatus.value = 'error'
      return
    }
    try {
      const updated = await apiFetchData<Article>(`/articles/${target.id}/save`, {
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
    if (isDirty.value || !article.value?.id) await save()
    const articleId = article.value?.id
    if (!articleId) return null
    publishing.value = true
    try {
      const updated = await apiFetchData<Article>(`/articles/${articleId}/publish`, { method: 'POST' })
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

  /** Persist pending edits now, skipping the debounce. Safe to call repeatedly. */
  function flush() {
    if (!isDirty.value) return
    void save()
  }

  // `visibilitychange` is the only teardown signal mobile browsers fire reliably —
  // `beforeunload` is skipped when a tab is discarded or the app is backgrounded.
  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') flush()
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', flush)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('pagehide', flush)
    clearTimers()
    // In-app navigation: the request outlives the component, so a plain save is enough.
    flush()
  })

  return {
    article,
    hasContent,
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
