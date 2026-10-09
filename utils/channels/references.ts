import type { ChannelReference, GroupChannel } from '~/types/api'

/** IDs, never labels, are persisted in drafts and channel messages. */
export const CHANNEL_REFERENCE_PATTERN = /<#([A-Za-z0-9_-]+)>/g

export type ChannelReferenceScope = {
  groupId: string
  channels: GroupChannel[]
}

export function channelReferenceToken(id: string): string {
  return `<#${id}>`
}

export function channelReferenceLabel(reference: ChannelReference): string {
  if (!reference.accessible || !reference.channelId || !reference.name) return 'Private'
  return reference.displayName?.trim() || reference.name
}

export function unavailableChannelReference(token: string): ChannelReference {
  return { token, channelId: null, name: null, displayName: null, privacy: 'private', accessible: false }
}

/** A missing target stays opaque, including while a scope is loading or revoked. */
export function channelReferenceFromScope(token: string, scope?: ChannelReferenceScope): ChannelReference {
  const channel = scope?.channels.find(item => item.groupId === scope.groupId && channelReferenceToken(item.id) === token)
  return channel
    ? { token, channelId: channel.id, name: channel.name, displayName: channel.displayName, privacy: channel.privacy, accessible: true }
    : unavailableChannelReference(token)
}

export function channelReferenceSuggestions(scope: ChannelReferenceScope | undefined, query: string): GroupChannel[] {
  const needle = query.trim().toLowerCase()
  return (scope?.channels ?? []).filter(channel => channel.groupId === scope?.groupId && !channel.archivedAt
    && (!needle || channel.name.toLowerCase().includes(needle) || channel.displayName?.toLowerCase().includes(needle)))
    .sort((a, b) => Number(b.name.toLowerCase().startsWith(needle)) - Number(a.name.toLowerCase().startsWith(needle)) || a.name.localeCompare(b.name))
    .slice(0, 10)
}

/** The live authorized list also covers revocations/renames missed while disconnected. */
export function visibleChannelReferences(body: string, scope: ChannelReferenceScope): ChannelReference[] {
  return [...body.matchAll(CHANNEL_REFERENCE_PATTERN)].map(match => channelReferenceFromScope(match[0], scope))
}

/** Clipboard, menus and accessibility get readable, already-authorized labels. */
export function channelReferencePlainText(body: string, references: ChannelReference[] = []): string {
  const byToken = new Map(references.map(reference => [reference.token, reference]))
  return body.replace(CHANNEL_REFERENCE_PATTERN, token => {
    const reference = byToken.get(token) ?? unavailableChannelReference(token)
    return `${reference.privacy === 'private' ? '🔒 ' : '#'}${channelReferenceLabel(reference)}`
  })
}
