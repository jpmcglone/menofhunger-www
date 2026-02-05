import type { Ref } from 'vue'
import type { MessageConversation } from '~/types/api'

export type TypingUserDisplay = {
  userId: string
  username: string
  tier: 'premium' | 'verified' | 'normal'
}

type UseChatTypingOptions = {
  me: Ref<{ id?: string | null } | null | undefined>
  conversations: Ref<{ primary: MessageConversation[]; requests: MessageConversation[] }>
  selectedConversation: Ref<MessageConversation | null>
  selectedConversationId: Ref<string | null>
  composerText: Ref<string>
  emitMessagesTyping: (conversationId: string, typing: boolean) => void
}

export function useChatTyping({
  me,
  conversations,
  selectedConversation,
  selectedConversationId,
  composerText,
  emitMessagesTyping,
}: UseChatTypingOptions) {
  const typingByConversationId = ref<Map<string, Map<string, number>>>(new Map())
  const typingSweepTimer = ref<ReturnType<typeof setInterval> | null>(null)
  const TYPING_TTL_MS = 3500

  function getTypingUsersForConversation(conversation: MessageConversation | null): TypingUserDisplay[] {
    if (!conversation?.id) return []
    const typingMap = typingByConversationId.value.get(conversation.id)
    if (!typingMap) return []
    const ids = [...typingMap.keys()].filter((id) => id && id !== me.value?.id)
    if (!ids.length) return []

    const result: TypingUserDisplay[] = []
    for (const uid of ids) {
      const p = conversation.participants?.find((pp) => pp.user?.id === uid)
      const u = p?.user
      const username = (u?.username ?? '').trim()
      if (!username) continue
      const tier: TypingUserDisplay['tier'] =
        u?.premium ? 'premium' : u?.verifiedStatus && u.verifiedStatus !== 'none' ? 'verified' : 'normal'
      result.push({ userId: uid, username, tier })
    }
    return result
  }

  const typingUsersAll = computed<TypingUserDisplay[]>(() => getTypingUsersForConversation(selectedConversation.value))
  const typingUsersTotalCount = computed(() => typingUsersAll.value.length)
  const typingUsersForDisplay = computed(() => typingUsersAll.value.slice(0, 2))
  const typingUsersByConversationId = computed<Record<string, TypingUserDisplay[]>>(() => {
    const result: Record<string, TypingUserDisplay[]> = {}
    const all = [...conversations.value.primary, ...conversations.value.requests]
    for (const convo of all) {
      const users = getTypingUsersForConversation(convo)
      if (users.length) result[convo.id] = users
    }
    return result
  })

  function typingNameClass(u: TypingUserDisplay): string {
    if (u.tier === 'premium') return 'text-[var(--moh-premium)]'
    if (u.tier === 'verified') return 'text-[var(--moh-verified)]'
    return 'text-gray-700 dark:text-gray-200'
  }

  function sweepTypingTtl() {
    const now = Date.now()
    const m = typingByConversationId.value
    if (!m.size) return
    let changed = false
    const next = new Map<string, Map<string, number>>()
    for (const [convoId, inner] of m.entries()) {
      const innerNext = new Map(inner)
      let innerChanged = false
      for (const [uid, exp] of innerNext.entries()) {
        if (now > exp) {
          innerNext.delete(uid)
          innerChanged = true
        }
      }
      if (innerNext.size > 0) {
        next.set(convoId, innerNext)
        if (innerChanged) changed = true
      } else if (inner.size > 0) {
        changed = true
      }
    }
    if (changed) typingByConversationId.value = next
  }

  function setRemoteTyping(conversationId: string, userId: string, typing?: boolean) {
    const now = Date.now()
    const next = new Map(typingByConversationId.value)
    const inner = new Map(next.get(conversationId) ?? [])
    if (typing === false) {
      inner.delete(userId)
    } else {
      inner.set(userId, now + TYPING_TTL_MS)
    }
    if (inner.size > 0) next.set(conversationId, inner)
    else next.delete(conversationId)
    typingByConversationId.value = next
  }

  function resetTyping() {
    typingByConversationId.value = new Map()
  }

  let typingStartTimer: ReturnType<typeof setTimeout> | null = null
  let typingStopTimer: ReturnType<typeof setTimeout> | null = null

  watch(
    [composerText, selectedConversationId],
    ([text, convoId], [prevText, prevConvoId]) => {
      // Conversation switched: ensure we stop typing in the old one.
      if (prevConvoId && prevConvoId !== convoId) {
        if (typingStartTimer) clearTimeout(typingStartTimer)
        if (typingStopTimer) clearTimeout(typingStopTimer)
        typingStartTimer = null
        typingStopTimer = null
        try {
          emitMessagesTyping(prevConvoId, false)
        } catch {
          // ignore
        }
        return
      }
      if (!convoId) return

      const has = Boolean((text ?? '').trim().length > 0)
      // If user cleared input, stop typing quickly.
      if (!has) {
        if (typingStartTimer) clearTimeout(typingStartTimer)
        typingStartTimer = null
        if (typingStopTimer) clearTimeout(typingStopTimer)
        typingStopTimer = setTimeout(() => {
          typingStopTimer = null
          emitMessagesTyping(convoId, false)
        }, 120)
        return
      }

      // Debounced "typing: true" emit, then extend stop timer on every keystroke.
      if (!typingStartTimer) {
        typingStartTimer = setTimeout(() => {
          typingStartTimer = null
          emitMessagesTyping(convoId, true)
        }, 220)
      }
      if (typingStopTimer) clearTimeout(typingStopTimer)
      typingStopTimer = setTimeout(() => {
        typingStopTimer = null
        emitMessagesTyping(convoId, false)
      }, 1600)
    },
  )

  onMounted(() => {
    typingSweepTimer.value = setInterval(sweepTypingTtl, 500)
  })

  onBeforeUnmount(() => {
    if (typingSweepTimer.value) {
      clearInterval(typingSweepTimer.value)
      typingSweepTimer.value = null
    }
    if (typingStartTimer) clearTimeout(typingStartTimer)
    if (typingStopTimer) clearTimeout(typingStopTimer)
  })

  return {
    resetTyping,
    setRemoteTyping,
    typingNameClass,
    typingUsersAll,
    typingUsersByConversationId,
    typingUsersForDisplay,
    typingUsersTotalCount,
  }
}
