import type { Ref } from 'vue'
import type { FeedPost } from '~/types/api'
import type { GroupComposerContext } from '~/utils/injection-keys'
import { useOnlyMePosts } from '~/composables/useOnlyMePosts'

/** Posted / pending submission handlers for the layout composer modal. */
export function useComposerPostHandlers(deps: {
  closeComposerModal: () => void
  groupComposerCtx: Ref<GroupComposerContext | null>
  sharePost: Ref<FeedPost | null>
  shareDialogOpen: Ref<boolean>
}) {
  const { closeComposerModal, groupComposerCtx, sharePost, shareDialogOpen } = deps
  const route = useRoute()
  const { prependPost: prependOnlyMePost } = useOnlyMePosts()
  const {
    prependToHomeFeed,
    prependOptimisticToHomeFeed,
    replaceOptimisticInHomeFeed,
    markOptimisticFailedInHomeFeed,
    markOptimisticPostingInHomeFeed,
    removeOptimisticFromHomeFeed,
  } = useHomeFeedPrepend()
  const { prependToProfileFeed } = useProfileFeedPrepend()
  const pendingPosts = usePendingPostsManager()

  function onComposerPending(payload: {
    localId: string
    optimisticPost: FeedPost
    perform: () => Promise<FeedPost | { id: string } | null | undefined>
  }) {
    // Close the modal immediately so the user can keep working.
    closeComposerModal()
    const groupPending = groupComposerCtx.value?.onComposerPending
    if (groupPending) {
      groupPending(payload)
      return
    }
    pendingPosts.submit({
      localId: payload.localId,
      optimisticPost: payload.optimisticPost,
      perform: payload.perform,
      callbacks: {
        insert: (p) => prependOptimisticToHomeFeed(p),
        replace: (lid, real) => {
          replaceOptimisticInHomeFeed(lid, real)
          // Also prepend to the profile feed in case the viewer is on their own profile.
          if (real.id && real.visibility !== 'onlyMe' && !real.communityGroupId) {
            prependToProfileFeed(real)
          }
        },
        markFailed: (lid, msg) => markOptimisticFailedInHomeFeed(lid, msg),
        markPosting: (lid) => markOptimisticPostingInHomeFeed(lid),
        remove: (lid) => removeOptimisticFromHomeFeed(lid),
      },
    })
  }

  function onComposerPosted(payload: { id: string; visibility: string; post?: FeedPost }) {
    closeComposerModal()
    if (payload.visibility === 'onlyMe' && payload.post) {
      prependOnlyMePost(payload.post)
      if (route.path !== '/only-me') {
        navigateTo('/only-me?posted=1')
      }
    } else if (payload.post && payload.post.id && payload.post.kind === 'checkin') {
      // Check-in posts: prepend to home feed and open the share dialog in place —
      // no navigation so the user stays on the current page.
      prependToHomeFeed(payload.post)
      prependToProfileFeed(payload.post)
      sharePost.value = payload.post
      shareDialogOpen.value = true
    } else if (payload.post && payload.post.id && !payload.post.communityGroupId) {
      // Prepend to home feed immediately and track in localInserts so it survives
      // the next hard refresh (home page uses keepalive → onActivated → refresh()).
      prependToHomeFeed(payload.post)
      // Also push to the profile feed in case the viewer is on their own profile.
      prependToProfileFeed(payload.post)
    }
  }

  return { onComposerPending, onComposerPosted }
}
