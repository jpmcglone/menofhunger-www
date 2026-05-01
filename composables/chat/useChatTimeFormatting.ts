import type { Message } from '~/types/api'
import {
  formatDayDividerLabel,
  formatListTime,
  formatMessageTime,
  formatMessageTimeFull,
} from '~/utils/time-format'

export type ChatListDivider = { type: 'divider'; key: string; dayKey: string; label: string }
export type ChatListMessage = {
  type: 'message'
  key: string
  message: Message
  index: number
  /**
   * Precomputed `Date.parse(message.createdAt)` so downstream consumers
   * (read-indicator computation, message clustering) don't `Date.parse`
   * the same string per recompute. NaN-safe: 0 when the timestamp is bogus.
   */
  createdAtMs: number
}
export type ChatListItem = ChatListDivider | ChatListMessage

function getDayKey(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'unknown'
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseMs(iso: string): number {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : 0
}

export function useChatTimeFormatting() {
  function buildMessagesWithDividers(list: Message[]) {
    const output: ChatListItem[] = []
    let lastDayKey: string | null = null
    list.forEach((message, index) => {
      // Keep keys stable for optimistic sends: server reconciliation can change `message.id`,
      // but we want the same row to stay mounted (avoid enter/leave weirdness).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stableId = ((message as any)?.__clientKey as string | undefined) ?? message.id
      const key = getDayKey(message.createdAt)
      if (key !== lastDayKey) {
        output.push({
          type: 'divider',
          key: `divider-${key}-${stableId}`,
          dayKey: key,
          label: formatDayDividerLabel(message.createdAt),
        })
        lastDayKey = key
      }
      output.push({
        type: 'message',
        key: stableId,
        message,
        index,
        createdAtMs: parseMs(message.createdAt),
      })
    })
    return output
  }

  return {
    buildMessagesWithDividers,
    formatDayDividerLabel,
    formatListTime,
    formatMessageTime,
    formatMessageTimeFull,
  }
}
