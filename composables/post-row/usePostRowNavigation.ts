import { isInteractiveTarget } from '~/utils/interactive-target'
import { boardPostHref } from '~/utils/board-links'
import type { FeedPost } from '~/types/api'

/** Permalink, board variant, and row click / aux-click / keyboard navigation. */
export function usePostRowNavigation(
  postView: ComputedRef<FeedPost>,
  state: { isDeletedPost: ComputedRef<boolean>; isPendingRow: ComputedRef<boolean>; clickable: ComputedRef<boolean> },
) {
  const { isDeletedPost, isPendingRow, clickable } = state
  const postPermalink = computed(() => boardPostHref(postView.value) ?? `/p/${encodeURIComponent(postView.value.id)}`)
  /** Board threads and comments render as Board rows; deleted or pending ones keep the post shell. */
  const boardVariant = computed<'post' | 'comment' | null>(() => {
    if (postView.value.kind !== 'board' || isDeletedPost.value || isPendingRow.value) return null
    return postView.value.parentId ? 'comment' : 'post'
  })

  function goToPost() {
    return navigateTo(postPermalink.value)
  }

  function onRowClick(e: MouseEvent) {
    if (!clickable.value) return
    if (isInteractiveTarget(e.target, 'postRow')) return
    if (e.metaKey || e.ctrlKey) {
      window.open(postPermalink.value, '_blank')
      return
    }
    void goToPost()
  }

  function onRowAuxClick(e: MouseEvent) {
    if (!clickable.value) return
    if (e.button !== 1) return
    if (isInteractiveTarget(e.target, 'postRow')) return
    e.preventDefault()
    window.open(postPermalink.value, '_blank')
  }

  function onRowKeydown(e: KeyboardEvent) {
    if (!clickable.value) return
    if (isInteractiveTarget(e.target, 'postRow')) return
    void goToPost()
  }

  return { postPermalink, boardVariant, onRowClick, onRowAuxClick, onRowKeydown }
}
