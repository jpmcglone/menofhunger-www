import type { Ref } from 'vue'
import type { WsPostsTypingPayload } from '~/types/api'
import type { TypingUserDisplay } from '~/composables/chat/useChatTyping'
import { userColorTier } from '~/utils/user-tier'

const TYPING_TTL_MS = 7000

type TypingEntry = { exp: number; display: TypingUserDisplay; replyToId: string | null }

/**
 * Tracks who is currently composing a reply to the given post.
 *
 * - Subscribes to `posts:typing` socket events filtered by `postId`.
 * - Filters out the current viewer's own id.
 * - Calls `emitPostsTyping` from the reply composer (via `notifyTyping`).
 * - Ensures `subscribePosts([postId])` stays active for the lifetime of the consumer.
 * - Board threads type into the root room and name the comment being answered
 *   (`replyToId`); `typingUsersFor(id)` narrows to one comment, `null` to top-level.
 */
export function usePostTyping(postIdRef: Ref<string | null | undefined>) {
  const { user } = useAuth()
  const { addPostsCallback, removePostsCallback, subscribePosts, unsubscribePosts, emitPostsTyping } = usePresence()

  const typingByUserId = ref<Map<string, TypingEntry>>(new Map())
  let sweepTimer: ReturnType<typeof setInterval> | null = null
  let startTimer: ReturnType<typeof setTimeout> | null = null
  let stopTimer: ReturnType<typeof setTimeout> | null = null
  let isTyping = false
  let activeReplyToId: string | null = null

  function sweepExpired() {
    const now = Date.now()
    const m = typingByUserId.value
    if (!m.size) return
    const next = new Map<string, TypingEntry>()
    for (const [uid, entry] of m.entries()) {
      if (now <= entry.exp) next.set(uid, entry)
    }
    if (next.size !== m.size) typingByUserId.value = next
  }

  const typingUsers = computed<TypingUserDisplay[]>(() => {
    return [...typingByUserId.value.values()].map((e) => e.display)
  })

  function typingUsersFor(replyToId: string | null): TypingUserDisplay[] {
    const out: TypingUserDisplay[] = []
    for (const entry of typingByUserId.value.values()) {
      if (entry.replyToId === replyToId) out.push(entry.display)
    }
    return out
  }

  function onTyping(payload: WsPostsTypingPayload) {
    const pid = (payload.postId ?? '').trim()
    if (!pid || pid !== (postIdRef.value ?? '').trim()) return
    const uid = (payload.user?.id ?? '').trim()
    if (!uid || uid === user.value?.id) return

    const now = Date.now()
    const next = new Map(typingByUserId.value)
    if (payload.typing === false) {
      next.delete(uid)
    } else {
      const tier = userColorTier(payload.user)
      const display: TypingUserDisplay = {
        userId: uid,
        username: payload.user.username ?? uid,
        tier,
        status: payload.status,
      }
      next.set(uid, { exp: now + TYPING_TTL_MS, display, replyToId: payload.replyToId?.trim() || null })
    }
    typingByUserId.value = next
  }

  const cb = { onTyping }

  // Subscribe/unsubscribe to the post room as the postId changes.
  let currentSub: string | null = null
  function ensureSub(pid: string | null | undefined) {
    const next = (pid ?? '').trim() || null
    if (next === currentSub) return
    if (currentSub) unsubscribePosts([currentSub])
    currentSub = next
    if (next) subscribePosts([next])
  }

  onMounted(() => {
    if (!import.meta.client) return
    addPostsCallback(cb)
    ensureSub(postIdRef.value)
    sweepTimer = setInterval(sweepExpired, 500)
  })

  watch(() => postIdRef.value, (next) => {
    typingByUserId.value = new Map()
    ensureSub(next)
  })

  function emitStop(pid: string) {
    emitPostsTyping(pid, false, activeReplyToId)
    isTyping = false
  }

  onBeforeUnmount(() => {
    removePostsCallback(cb)
    if (sweepTimer) clearInterval(sweepTimer)
    if (startTimer) clearTimeout(startTimer)
    if (stopTimer) clearTimeout(stopTimer)
    sweepTimer = null
    startTimer = null
    stopTimer = null
    if (currentSub) {
      unsubscribePosts([currentSub])
      currentSub = null
    }
    if (isTyping) {
      const pid = (postIdRef.value ?? '').trim()
      if (pid) emitStop(pid)
    }
  })

  /**
   * Call from the composer watcher with the current text value.
   * Debounces start (220ms) and stop (1600ms after idle / 120ms on clear).
   */
  function notifyTyping(text: string, opts?: { replyToId?: string | null }) {
    const pid = (postIdRef.value ?? '').trim()
    if (!pid) return

    const replyToId = opts?.replyToId?.trim() || null
    if (isTyping && replyToId !== activeReplyToId) emitStop(pid)
    activeReplyToId = replyToId

    const hasText = Boolean((text ?? '').trim().length > 0)

    if (!hasText) {
      if (startTimer) { clearTimeout(startTimer); startTimer = null }
      if (stopTimer) clearTimeout(stopTimer)
      stopTimer = setTimeout(() => {
        stopTimer = null
        if (isTyping) emitStop(pid)
      }, 120)
      return
    }

    if (!startTimer && !isTyping) {
      startTimer = setTimeout(() => {
        startTimer = null
        emitPostsTyping(pid, true, activeReplyToId)
        isTyping = true
      }, 220)
    } else if (isTyping) {
      // Keep the indicator alive past the viewers' TTL while the draft is still changing.
      emitPostsTyping(pid, true, activeReplyToId)
    }
    if (stopTimer) clearTimeout(stopTimer)
    stopTimer = setTimeout(() => {
      stopTimer = null
      if (isTyping) emitStop(pid)
    }, 3200)
  }

  function stopTyping() {
    const pid = (postIdRef.value ?? '').trim()
    if (startTimer) { clearTimeout(startTimer); startTimer = null }
    if (stopTimer) { clearTimeout(stopTimer); stopTimer = null }
    if (isTyping && pid) emitStop(pid)
  }

  return { typingUsers, typingUsersFor, notifyTyping, stopTyping }
}
