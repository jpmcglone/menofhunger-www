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
 * Build the params for the post-success toast ("Posted · Tap to view", etc.).
 * Covers top-level posts, replies, check-ins, only-me, and group posts.
 */
export function buildPostedToastParams(
  post: FeedPost,
  options: { isReply?: boolean } = {},
): PostedToastParams {
  const isReply = Boolean(options.isReply || post.parentId)
  const isRepost = post.kind === 'repost'
  const isCheckin = post.kind === 'checkin'
  const isGroup = Boolean(post.communityGroupId)
  const vis = post.visibility

  const tone: AppToastTone = isCheckin
    ? 'success'
    : isGroup
      ? 'group'
      : vis === 'premiumOnly'
        ? 'premiumOnly'
        : vis === 'verifiedOnly'
          ? 'verifiedOnly'
          : vis === 'onlyMe'
            ? 'onlyMe'
            : 'public'

  if (isRepost) {
    return {
      title: 'Reposted',
      message: 'Tap to view',
      tone,
      to: `/p/${encodeURIComponent(post.id)}`,
      durationMs: 4000,
    }
  }

  if (isCheckin) {
    return {
      title: 'Checked in',
      message: 'Tap to view',
      tone,
      to: `/p/${encodeURIComponent(post.id)}`,
      durationMs: 4000,
    }
  }

  // Top-level non-onlyMe posts can be edited within 30 minutes of creation (max 3 edits).
  const isTopLevel = !isReply
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

  const title = isReply ? 'Reply posted' : 'Posted'

  return {
    title,
    message,
    tone,
    to: `/p/${encodeURIComponent(post.id)}`,
    durationMs: 4000,
  }
}
