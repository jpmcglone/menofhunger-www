import type { ProfilePostsFilter } from '~/utils/post-visibility'

export type UserMediaItem = {
  id: string
  postId: string
  kind: 'image' | 'video'
  url: string | null
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  durationSeconds: number | null
}

export function useUserMedia(
  usernameLower: Ref<string>,
  opts: {
    enabled?: Ref<boolean>
    visibility?: Ref<ProfilePostsFilter>
    sort?: Ref<'new' | 'trending'>
  } = {},
) {
  const { apiFetch } = useApiClient()
  const enabled = opts.enabled ?? computed(() => true)

  const items = ref<UserMediaItem[]>([])
  const nextCursor = ref<string | null>(null)
  const loading = ref(false)
  const loadingMore = ref(false)
  const error = ref<string | null>(null)
  const hasLoadedOnce = ref(false)
  const lastLoadedKey = ref<string>('')
  let loadPromise: Promise<void> | null = null

  function paramsKey() {
    return [
      usernameLower.value,
      opts.visibility?.value ?? 'all',
      opts.sort?.value ?? 'new',
    ].join('|')
  }

  function buildParams(cursor?: string | null) {
    const params = new URLSearchParams({ limit: '30' })
    const vis = opts.visibility?.value
    if (vis && vis !== 'all') params.set('visibility', vis)
    const sort = opts.sort?.value
    if (sort && sort !== 'new') params.set('sort', sort)
    if (cursor) params.set('cursor', cursor)
    return params
  }

  async function load(opts?: { force?: boolean }) {
    const force = Boolean(opts?.force)
    if (!enabled.value) {
      items.value = []
      nextCursor.value = null
      error.value = null
      lastLoadedKey.value = ''
      return
    }
    const key = paramsKey()
    if (!force && loadPromise && loading.value) {
      return await loadPromise
    }
    if (!force && hasLoadedOnce.value && key === lastLoadedKey.value) {
      return
    }
    const hadExistingItems = items.value.length > 0
    const task = (async () => {
      loading.value = true
      error.value = null
      if (!hadExistingItems) {
        items.value = []
      }
      nextCursor.value = null
      try {
        const res = await apiFetch<UserMediaItem[]>(
          `/posts/user/${encodeURIComponent(usernameLower.value)}/media?${buildParams()}`,
        )
        items.value = res.data ?? []
        nextCursor.value = res.pagination?.nextCursor ?? null
        lastLoadedKey.value = key
        hasLoadedOnce.value = true
      } catch (e: any) {
        error.value = e?.data?.meta?.errors?.[0]?.message ?? 'Failed to load media.'
        hasLoadedOnce.value = true
      } finally {
        loading.value = false
      }
    })()
    loadPromise = task
    try {
      await task
    } finally {
      if (loadPromise === task) loadPromise = null
    }
  }

  async function loadMore() {
    if (!nextCursor.value || loadingMore.value) return
    loadingMore.value = true
    try {
      const res = await apiFetch<UserMediaItem[]>(
        `/posts/user/${encodeURIComponent(usernameLower.value)}/media?${buildParams(nextCursor.value)}`,
      )
      items.value.push(...(res.data ?? []))
      nextCursor.value = res.pagination?.nextCursor ?? null
    } catch {
      // silently fail on pagination
    } finally {
      loadingMore.value = false
    }
  }

  watch(usernameLower, () => {
    items.value = []
    nextCursor.value = null
    hasLoadedOnce.value = false
    lastLoadedKey.value = ''
    if (enabled.value) void load()
  }, { flush: 'post' })

  watch(enabled, (on) => {
    if (!on) {
      items.value = []
      nextCursor.value = null
      error.value = null
      lastLoadedKey.value = ''
      return
    }
    if (import.meta.client) void load()
  }, { flush: 'post', immediate: true })

  if (opts.visibility) watch(opts.visibility, () => { if (enabled.value) void load() })
  if (opts.sort) watch(opts.sort, () => { if (enabled.value) void load() })

  onMounted(() => {
    if (import.meta.client && enabled.value && items.value.length === 0 && !loading.value) {
      void load()
    }
  })

  return { items, nextCursor, loading, loadingMore, error, hasLoadedOnce, load, loadMore }
}
