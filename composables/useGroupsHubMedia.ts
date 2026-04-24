import { useCursorFeed } from '~/composables/useCursorFeed'

export type GroupsHubMediaItem = {
  id: string
  postId: string
  kind: 'image' | 'video'
  url: string | null
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  durationSeconds: number | null
}

export function useGroupsHubMedia(
  opts: {
    enabled?: Ref<boolean>
    sort?: Ref<'new' | 'trending'>
  } = {},
) {
  const enabled = opts.enabled ?? computed(() => true)

  const mediaFeed = useCursorFeed<GroupsHubMediaItem>({
    stateKey: 'groups-hub-media-feed-local',
    stateMode: 'local',
    buildRequest: (cursor) => {
      const params = new URLSearchParams({ limit: '30' })
      const sort = opts.sort?.value
      if (sort && sort !== 'new') params.set('sort', sort)
      if (cursor) params.set('cursor', cursor)
      return {
        path: '/groups/me/media',
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
    return opts.sort?.value ?? 'new'
  }

  async function load(loadOpts?: { force?: boolean }) {
    const force = Boolean(loadOpts?.force)
    if (!enabled.value) {
      items.value = []
      nextCursor.value = null
      error.value = null
      hasLoadedOnce.value = false
      lastLoadedKey.value = ''
      return
    }
    const key = paramsKey()
    if (!force && hasLoadedOnce.value && key === lastLoadedKey.value) return
    await mediaFeed.refresh()
    hasLoadedOnce.value = true
    if (!error.value) lastLoadedKey.value = key
  }

  async function loadMore() {
    if (!enabled.value) return
    if (loading.value || loadingMore.value) return
    const key = paramsKey()
    if (!hasLoadedOnce.value || key !== lastLoadedKey.value) {
      await load({ force: true })
      return
    }
    await mediaFeed.loadMore()
  }

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

  if (opts.sort) watch(opts.sort, () => { if (enabled.value) void load() })

  onMounted(() => {
    if (import.meta.client && enabled.value && items.value.length === 0 && !loading.value) {
      void load()
    }
  })

  return { items, nextCursor, loading, loadingMore, error, hasLoadedOnce, load, loadMore }
}
