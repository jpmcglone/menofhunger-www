import type { CommunityGroupShell, FeedPost } from '~/types/api'

/** Props of `AppPostRow`. */
export interface PostRowProps {
  post: FeedPost
  clickable?: boolean
  /** When true, visually highlight this row (e.g. the post being viewed on /p/:id). */
  highlight?: boolean
  /** When true, omit the bottom border (e.g. parent in a thread block). */
  noBorderBottom?: boolean
  /** When true, show a vertical line in the avatar column from the bottom of the avatar down (parent in a thread). */
  showThreadLineBelowAvatar?: boolean
  /** When true, show a vertical line from the top of the row down to the top of the avatar (reply in a thread). */
  showThreadLineAboveAvatar?: boolean
  /** When true, activate this post's video as soon as it's ready (e.g. newly posted). */
  activateVideoOnMount?: boolean
  /** When true, use tighter vertical padding (e.g. in reply lists). */
  compact?: boolean
  /** When set, color the thread line by root post visibility (e.g. blue for verified, orange for premium). */
  threadLineTint?: 'verified' | 'premium' | null
  /** Group wall: owner can pin a root post to the group feed top. */
  groupWall?: { groupId: string; viewerIsOwner: boolean } | null
  /** Combined feed / discovery: show inline group context in the header column. */
  feedGroup?: CommunityGroupShell | null
  /** Lighter row separator (matches home/profile feel vs default moh-border). */
  subtleBorderBottom?: boolean
  /**
   * When true, show a "Replying to @username" line between the header and body
   * when this post is a reply (has a parentId / parent author). Intended for the
   * Notifications page so viewers know whose post they are replying to.
   */
  showReplyingTo?: boolean
  /**
   * When false, skip IntersectionObserver view tracking (FeedPostRow already
   * observes the wrapper for the full chain — avoids duplicate observers).
   */
  trackViews?: boolean
  /**
   * Composer preview: render the row exactly as it will publish, minus the controls that act on a
   * post that does not exist yet (Catch me up, the more menu). Images stay openable.
   */
  preview?: boolean
}

export interface PostRowEmits {
  (e: 'deleted', id: string): void
  (e: 'edited', payload: { id: string; post: FeedPost }): void
  (e: 'bookmarkUpdated', payload: { postId: string; hasBookmarked: boolean; collectionIds: string[] }): void
  (e: 'groupPinChanged'): void
}
