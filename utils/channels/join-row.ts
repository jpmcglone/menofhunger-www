import type { ChannelMessage } from '~/types/api'

/** First name shown on the Welcome button; matches the API's "Welcome, <first name>" message. */
export function welcomeFirstName(sender: Pick<ChannelMessage['sender'], 'name' | 'username'>) {
  return sender.name?.trim().split(/\s+/)[0] || sender.username || 'them'
}

/** A system row never groups with the messages around it, and never counts as the viewer's last message. */
export const isJoinRow = (message: Pick<ChannelMessage, 'kind'>) => message.kind === 'groupJoin'

/** The row after a successful Welcome: the button hides at once; the server's next revision confirms it. */
export function markWelcomed(message: ChannelMessage): ChannelMessage {
  return { ...message, joinWelcome: { canWelcome: false } }
}
