import type { FollowListUser, MessageConversation } from '~/types/api'

export type DockMode = 'expanded' | 'minimized' | 'closed'
export interface DockSession { key: string; conversationId: string | null; title: string; mode: DockMode; marv: boolean; atBottom: boolean; dockable?: boolean; draftRecipients?: FollowListUser[]; jumpMessageId?: string }

export function isDesktopChatDevice(width: number, finePointer: boolean, userAgent: string, platform: string, maxTouchPoints: number) {
  const iPad = /iPad/i.test(userAgent) || (/Mac/i.test(platform) && maxTouchPoints > 1)
  return width >= 1024 && finePointer && !iPad
}

/** Stable session order also serves as overflow-tab order. Explicit activation moves a session into a slot. */
export function openDockSession(sessions: DockSession[], key: string, capacity: number, automatic = false): DockSession[] {
  const existing = sessions.find(session => session.key === key || session.conversationId === key)
  if (automatic && (existing || sessions.filter(session => session.mode === 'expanded' && session.dockable !== false).length >= capacity)) return sessions
  const opened: DockSession = existing ? { ...existing, mode: 'expanded' } : { key, conversationId: key === 'marv' ? null : key, title: key === 'marv' ? 'MARV' : 'Chat', mode: 'expanded', marv: key === 'marv', atBottom: true }
  const rest = sessions.filter(session => session !== existing).map(session => ({ ...session }))
  const expanded = rest.filter(session => session.mode === 'expanded' && session.dockable !== false)
  // User activation can make room, but arrivals never displace a conversation.
  if (opened.dockable !== false && expanded.length >= capacity) expanded[0]!.mode = 'minimized'
  return [...rest, opened]
}

export function canAutoOpenConversation(conversation: MessageConversation | undefined, senderId: string, viewerId: string, visible: boolean) {
  return Boolean(visible && senderId !== viewerId && conversation && conversation.viewerStatus === 'accepted' && !conversation.isMuted && !conversation.isBlockedWith && conversation.type !== 'crew_wall')
}

/** Recipient identity matches the shared draft store; creating a DM keeps this mounted key. */
export function openDockDraft(sessions: DockSession[], recipients: FollowListUser[], capacity: number) {
  const key = `draft-${recipients.map(recipient => recipient.id).sort().join('_')}`
  const opened = openDockSession(sessions, key, capacity)
  return { key, sessions: opened.map(session => session.key === key ? {
    ...session,
    conversationId: session.draftRecipients ? session.conversationId : null,
    draftRecipients: [...recipients],
    title: recipients.map(recipient => recipient.name || recipient.username || 'User').join(', '),
  } : session) }
}
