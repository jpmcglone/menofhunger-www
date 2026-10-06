import type { AdminImageReviewBelongsTo, AdminImageReviewListItem } from '~/types/api'

export type MediaReviewTone = 'channel' | 'post' | 'profile' | 'group' | 'message' | 'content' | 'orphan' | 'neutral'

export type MediaReviewDescription = {
  label: string
  tone: MediaReviewTone
  title: string
  subtitle: string | null
  protectedMedia: boolean
}

export const MEDIA_REVIEW_TONE_CLASS: Record<MediaReviewTone, string> = {
  channel: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
  post: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
  profile: 'bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-200',
  group: 'bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200',
  message: 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200',
  content: 'bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200',
  orphan: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  neutral: 'bg-gray-100 text-gray-700 dark:bg-zinc-700 dark:text-zinc-200',
}

const TYPE_LABELS: Record<AdminImageReviewBelongsTo, string> = {
  post: 'Post',
  post_thumbnail: 'Post poster',
  message: 'Direct message',
  message_thumbnail: 'Message poster',
  user: 'Profile',
  group: 'Group',
  crew: 'Crew',
  poll: 'Poll',
  article: 'Article',
  article_inline: 'Article',
  announcement: 'Announcement',
  newsletter: 'Newsletter',
  channel_upload: 'Channel upload',
  orphan: 'Unused',
}

export function mediaTypeLabel(type: AdminImageReviewBelongsTo | string) {
  return TYPE_LABELS[type as AdminImageReviewBelongsTo] ?? type
}

function at(username: string | null | undefined) {
  return username ? `@${username}` : null
}

/** One human line per asset: where it lives and who put it there. */
export function describeMediaItem(item: AdminImageReviewListItem): MediaReviewDescription {
  const type = item.belongsToSummary
  const uploader = at(item.uploaderUsername)
  const inChannel = Boolean(item.channelId)
  const channelTitle = inChannel
    ? `#${item.channelName ?? 'channel'}${item.groupName ? ` · ${item.groupName}` : ''}`
    : null

  if (type === 'orphan') {
    return { label: 'Unused', tone: 'orphan', title: 'Not used anywhere', subtitle: null, protectedMedia: false }
  }
  if (inChannel && (type === 'message' || type === 'message_thumbnail' || type === 'channel_upload')) {
    const sent = type === 'channel_upload' ? 'Uploading' : 'by'
    return {
      label: 'Channel',
      tone: 'channel',
      title: channelTitle!,
      subtitle: uploader ? `${sent} ${uploader}` : null,
      protectedMedia: true,
    }
  }
  if (type === 'message' || type === 'message_thumbnail') {
    return { label: 'Direct message', tone: 'message', title: 'Direct message', subtitle: uploader ? `by ${uploader}` : null, protectedMedia: false }
  }
  if (type === 'post' || type === 'post_thumbnail') {
    return { label: 'Post', tone: 'post', title: item.authorUsername ? `Post by @${item.authorUsername}` : 'Post', subtitle: null, protectedMedia: false }
  }
  if (type === 'user') {
    return { label: 'Profile', tone: 'profile', title: item.profileUsername ? `Profile · @${item.profileUsername}` : 'Profile', subtitle: null, protectedMedia: false }
  }
  if (type === 'group') {
    return { label: 'Group', tone: 'group', title: item.groupName ?? 'Group', subtitle: null, protectedMedia: false }
  }
  if (type === 'crew') {
    return { label: 'Crew', tone: 'group', title: item.crewName ?? 'Crew', subtitle: null, protectedMedia: false }
  }
  if (type === 'article' || type === 'article_inline') {
    return { label: 'Article', tone: 'content', title: type === 'article_inline' ? 'Article image' : 'Article cover', subtitle: null, protectedMedia: false }
  }
  return { label: mediaTypeLabel(type), tone: 'neutral', title: mediaTypeLabel(type), subtitle: null, protectedMedia: false }
}

/** Where clicking "go to the thing" should land, when there is a real destination. */
export function mediaOwnerLink(item: AdminImageReviewListItem): { to: string; label: string } | null {
  if (item.groupSlug && item.channelId) {
    return { to: `/groups/${encodeURIComponent(item.groupSlug)}/channels/${encodeURIComponent(item.channelId)}`, label: 'Open channel' }
  }
  if (item.postId) return { to: `/p/${encodeURIComponent(item.postId)}`, label: 'Open post' }
  if (item.pollPostId) return { to: `/p/${encodeURIComponent(item.pollPostId)}`, label: 'Open poll' }
  if (item.profileUsername) return { to: `/u/${encodeURIComponent(item.profileUsername)}`, label: 'Open profile' }
  if (item.groupSlug) return { to: `/groups/${encodeURIComponent(item.groupSlug)}`, label: 'Open group' }
  if (item.crewSlug) return { to: `/c/${encodeURIComponent(item.crewSlug)}`, label: 'Open crew' }
  if (item.articleSlug || item.articleId) return { to: `/a/${encodeURIComponent(item.articleSlug || item.articleId!)}`, label: 'Open article' }
  return null
}
