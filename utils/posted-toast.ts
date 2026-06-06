import type { FeedPost } from '~/types/api'
import type { AppToastTone } from '~/composables/useAppToast'

export type PostedToastParams = {
  title: string
  message: string
  tone: AppToastTone
  to: string
  durationMs: number
}

/**
 * Build the params for the "Posted · Tap to view" success toast.
 * Returns null when no toast should be shown:
 *  - check-in posts (the share modal handles their post-success flow)
 *  - reply posts when `skipReplies` is true (optimistic path keeps replies quiet)
 */
export function buildPostedToastParams(
  post: FeedPost,
  options: { isReply?: boolean; skipReplies?: boolean } = {},
): PostedToastParams | null {
  if (post.kind === 'checkin') return null
  if (options.skipReplies && (options.isReply || Boolean(post.parentId))) return null

  const isGroup = Boolean(post.communityGroupId)
  const vis = post.visibility

  const tone: AppToastTone = isGroup
    ? 'group'
    : vis === 'premiumOnly'
      ? 'premiumOnly'
      : vis === 'verifiedOnly'
        ? 'verifiedOnly'
        : vis === 'onlyMe'
          ? 'onlyMe'
          : 'public'

  // Top-level non-onlyMe posts can be edited within 30 minutes of creation (max 3 edits).
  // onlyMe posts have no time limit, so we skip the hint for them.
  const isTopLevel = !options.isReply && !post.parentId
  const editHint = isTopLevel && vis !== 'onlyMe' ? '30 min to edit' : null

  const contextLabel = isGroup
    ? 'Posted to group'
    : vis === 'premiumOnly'
      ? 'Premium only'
      : vis === 'verifiedOnly'
        ? 'Verified only'
        : vis === 'onlyMe'
          ? 'Only you can see this'
          : null

  const messageParts = [contextLabel, editHint, 'Tap to view'].filter(Boolean)
  const message = messageParts.join(' · ')

  const title = options.isReply || post.parentId ? 'Reply posted' : 'Posted'

  return {
    title,
    message,
    tone,
    to: `/p/${encodeURIComponent(post.id)}`,
    durationMs: 3200,
  }
}
