import type { FeedPost } from '~/types/api'

export type BookmarkDialogState = {
  open: boolean
  post: FeedPost | null
  hasBookmarked: boolean
  collectionIds: string[]
  onChange?: (state: { hasBookmarked: boolean; collectionIds: string[] }, delta: number) => void
}

export function useBookmarkDialog() {
  const state = useState<BookmarkDialogState>('moh.bookmark-dialog', () => ({
    open: false,
    post: null,
    hasBookmarked: false,
    collectionIds: [],
  }))

  function open(params: {
    post: FeedPost
    hasBookmarked: boolean
    collectionIds: string[]
    onChange?: BookmarkDialogState['onChange']
  }) {
    state.value = {
      open: true,
      post: params.post,
      hasBookmarked: params.hasBookmarked,
      collectionIds: params.collectionIds,
      onChange: params.onChange,
    }
  }

  function close() {
    state.value = { ...state.value, open: false }
  }

  return {
    open: computed(() => state.value.open),
    post: computed(() => state.value.post),
    hasBookmarked: computed(() => state.value.hasBookmarked),
    collectionIds: computed(() => state.value.collectionIds),
    onChange: computed(() => state.value.onChange),
    openDialog: open,
    close,
  }
}
