import type { Message } from '~/types/api'
import {
  formatDayDividerLabel,
  formatListTime,
  formatMessageTime,
  formatMessageTimeFull,
} from '~/utils/time-format'

export type ChatListDivider = { type: 'divider'; key: string; dayKey: string; label: string }
export type ChatListMessage = { type: 'message'; key: string; message: Message; index: number }
export type ChatListItem = ChatListDivider | ChatListMessage

function getDayKey(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'unknown'
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function useChatTimeFormatting() {
  function buildMessagesWithDividers(list: Message[]) {
    const output: ChatListItem[] = []
    let lastDayKey: string | null = null
    list.forEach((message, index) => {
      const key = getDayKey(message.createdAt)
      if (key !== lastDayKey) {
        output.push({
          type: 'divider',
          key: `divider-${key}-${message.id}`,
          dayKey: key,
          label: formatDayDividerLabel(message.createdAt),
        })
        lastDayKey = key
      }
      output.push({ type: 'message', key: message.id, message, index })
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
