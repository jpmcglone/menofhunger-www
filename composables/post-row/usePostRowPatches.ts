import type { FeedPost } from '~/types/api'
import type { PostRowEmits } from './post-row-types'

/** Local post-state patches driven by bookmark and view-count child events. */
export function usePostRowPatches(
  postState: Ref<FeedPost>,
  postView: ComputedRef<FeedPost>,
  emit: PostRowEmits,
) {
  function onBookmarkCountDelta(delta: number) {
    const d = Math.trunc(Number(delta) || 0)
    if (!d) return
    const next = Math.max(0, Math.floor(Number(postState.value.bookmarkCount ?? 0)) + d)
    postState.value = { ...postState.value, bookmarkCount: next }
  }

  function onBookmarkStateChanged(payload: { hasBookmarked: boolean; collectionIds: string[] }) {
    const nextHas = Boolean(payload?.hasBookmarked)
    const nextCollectionIds = Array.isArray(payload?.collectionIds) ? payload.collectionIds.filter(Boolean) : []
    postState.value = {
      ...postState.value,
      viewerHasBookmarked: nextHas,
      viewerBookmarkCollectionIds: nextCollectionIds,
    }
    emit('bookmarkUpdated', {
      postId: postView.value.id,
      hasBookmarked: nextHas,
      collectionIds: nextCollectionIds,
    })
  }

  function onViewerCountSynced(payload: { viewerCount: number, totalViewCount: number }) {
    const nextUnique = Math.max(0, Math.floor(Number(payload.viewerCount ?? 0)))
    const nextTotal = Math.max(nextUnique, Math.floor(Number(payload.totalViewCount ?? 0)))
    const currentUnique = Math.max(0, Math.floor(Number(postState.value.viewerCount ?? 0)))
    const currentTotal = Math.max(currentUnique, Math.floor(Number(postState.value.totalViewCount ?? currentUnique)))
    if (nextUnique === currentUnique && nextTotal === currentTotal) return
    postState.value = {
      ...postState.value,
      viewerCount: Math.max(currentUnique, nextUnique),
      totalViewCount: Math.max(currentTotal, nextTotal),
    }
  }

  return { onBookmarkCountDelta, onBookmarkStateChanged, onViewerCountSynced }
}
