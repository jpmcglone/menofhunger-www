import type { ChannelMessage, GroupChannel } from '~/types/api'

/** Channel content follows `revision`; read position and preference follow `viewerUpdatedAt`. */
export function mergeChannel(current: GroupChannel | undefined, incoming: GroupChannel): GroupChannel {
  if (!current) return incoming
  const contentFresh = incoming.revision >= current.revision
  const viewerFresh = (incoming.viewerUpdatedAt ?? '') >= (current.viewerUpdatedAt ?? '')
  if (contentFresh && viewerFresh) return incoming
  if (!contentFresh && !viewerFresh) return current
  const content = contentFresh ? incoming : current
  const viewer = viewerFresh ? incoming : current
  // New messages can raise unread state even when the snapshot's read position is older.
  const counts = incoming.revision > current.revision ? incoming : viewer
  return { ...content, readThrough: viewer.readThrough, preference: viewer.preference, mutedUntil: viewer.mutedUntil, hidden: viewer.hidden, viewerUpdatedAt: viewer.viewerUpdatedAt, hasUnread: counts.hasUnread, personalCount: counts.personalCount }
}
/** The title shown for a channel; the unique handle in `name` is the fallback. */
export const channelTitle = (channel: { name: string; displayName?: string | null }) => channel.displayName?.trim() || channel.name
/** A handle suggestion (lowercase letters, numbers, hyphens) for a free-form title. */
export const channelHandleFor = (title: string) => title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
/** A deleted message remains only as the placeholder root of replies that still exist. */
export const isVisibleChannelMessage = (message: Pick<ChannelMessage, 'deletedForAll' | 'threadRootId' | 'replyCount'>) =>
  !message.deletedForAll || (!message.threadRootId && message.replyCount > 0)
export function mergeChannelMessages(current: ChannelMessage[], incoming: ChannelMessage[]) {
  const byId = new Map(current.map(message => [message.id, message]))
  for (const message of incoming) {
    const prior = byId.get(message.id)
    if (!prior || prior.revision <= message.revision) byId.set(message.id, message)
  }
  return [...byId.values()].filter(isVisibleChannelMessage).sort((a, b) => a.sequence - b.sequence)
}
/** Messages appended after the previously newest one; prepends and in-place edits yield none. */
export function channelArrivals(rows: Pick<ChannelMessage, 'id' | 'sender'>[], previousNewestId: string | null | undefined, viewerId: string | null | undefined) {
  const index = previousNewestId ? rows.findIndex(message => message.id === previousNewestId) : -1
  const arrived = index < 0 ? [] : rows.slice(index + 1)
  const own = arrived.filter(message => message.sender.id === viewerId).length
  return { own, others: arrived.length - own }
}
export const channelPath = (groupId: string, channelId: string) => `/groups/${encodeURIComponent(groupId)}/channels/${encodeURIComponent(channelId)}`
export function channelLink(slug: string, channelId: string, message?: Pick<ChannelMessage, 'id' | 'threadRootId'>) {
  const path = `/groups/${encodeURIComponent(slug)}/channels/${encodeURIComponent(channelId)}`
  const query = new URLSearchParams()
  if (message?.id) query.set('message', message.id)
  if (message?.threadRootId) query.set('thread', message.threadRootId)
  return path + (query.size ? `?${query}` : '')
}
