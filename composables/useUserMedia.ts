import type { ProfilePostsFilter } from '~/utils/post-visibility'
import { useCursorFeed } from '~/composables/useCursorFeed'

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
  const enabled = opts.enabled ?? computed(() => true)

  const mediaFeed = useCursorFeed<UserMediaItem>({
    stateKey: 'user-media-feed-local',
    stateMode: 'local',
    buildRequest: (cursor) => {
      const params = new URLSearchParams({ limit: '30' })
      const vis = opts.visibility?.value
      if (vis && vis !== 'all') params.set('visibility', vis)
      const sort = opts.sort?.value
      if (sort && sort !== 'new') params.set('sort', sort)
      if (cursor) params.set('cursor', cursor)
      return {
        path: `/posts/user/${encodeURIComponent(usernameLower.value)}/media`,
        query: Object.fromEntries(params.entries()),
      }
    },
    defaultErrorMessage: 'Failed to load media.',
  })
  const items = mediaFeed.items
  const nextCursor = mediaFeed.nextCursor
  const loading = mediaFeed.loading
  const loadingMore = mediaFeed.loadingMore
  const error = mediaFeed.error
  const hasLoadedOnce = ref(false)
  const lastLoadedKey = ref<string>('')

  function paramsKey() {
    return [
      usernameLower.value,
      opts.visibility?.value ?? 'all',
      opts.sort?.value ?? 'new',
    ].join('|')
  }

  async function load(opts?: { force?: boolean }) {
    const force = Boolean(opts?.force)
    if (!enabled.value) {
      items.value = []
      nextCursor.value = null
      error.value = null
      hasLoadedOnce.value = false
      lastLoadedKey.value = ''
      return
    }
    const key = paramsKey()
    if (!force && hasLoadedOnce.value && key === lastLoadedKey.value) {
      return
    }
    await mediaFeed.refresh()
    hasLoadedOnce.value = true
    if (!error.value) lastLoadedKey.value = key
  }

  async function loadMore() {
    if (!enabled.value) return
    if (loading.value || loadingMore.value) return
    const key = paramsKey()
    // Only paginate when params still match the currently loaded dataset.
    if (!hasLoadedOnce.value || key !== lastLoadedKey.value) {
      await load({ force: true })
      return
    }
    await mediaFeed.loadMore()
  }

  watch(usernameLower, () => {
    items.value = []
    nextCursor.value = null
    error.value = null
    hasLoadedOnce.value = false
    lastLoadedKey.value = ''
    if (enabled.value) void load()
  }, { flush: 'post' })

  watch(enabled, (on) => {
    if (!on) {
      items.value = []
      nextCursor.value = null
      error.value = null
      hasLoadedOnce.value = false
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
