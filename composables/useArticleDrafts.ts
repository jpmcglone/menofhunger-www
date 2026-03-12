import type { Article } from '~/types/api'
import type { ProfilePostsFilter } from '~/utils/post-visibility'

export function useArticleDrafts(opts?: {
  visibility?: Ref<ProfilePostsFilter>
  /** When false, the watcher will not reload on visibility change. */
  enabled?: Ref<boolean>
}) {
  const { apiFetch } = useApiClient()

  const drafts = ref<Article[]>([])
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const hasLoadedOnce = ref(false)
  const error = ref<string | null>(null)

  function buildParams() {
    const params = new URLSearchParams({ limit: '50' })
    if (opts?.visibility?.value && opts.visibility.value !== 'all') {
      params.set('visibility', opts.visibility.value)
    }
    return params
  }

  async function load() {
    loading.value = true
    error.value = null
    if (!hasLoadedOnce.value) drafts.value = []
    nextCursor.value = null
    try {
      const res = await apiFetch<Article[]>(`/articles/drafts?${buildParams()}`)
      drafts.value = res.data ?? []
      nextCursor.value = res.pagination?.nextCursor ?? null
    } catch (e: any) {
      error.value = e?.data?.meta?.errors?.[0]?.message ?? 'Failed to load drafts.'
    } finally {
      loading.value = false
      hasLoadedOnce.value = true
    }
  }

  async function deleteDraft(id: string) {
    const { apiFetchData } = useApiClient()
    await apiFetchData(`/articles/${id}`, { method: 'DELETE' })
    drafts.value = drafts.value.filter((d) => d.id !== id)
  }

  if (opts?.visibility) {
    watch(opts.visibility, () => {
      if (!opts.enabled || opts.enabled.value) load()
    })
  }

  return { drafts, nextCursor, loading, hasLoadedOnce, error, load, deleteDraft }
}
