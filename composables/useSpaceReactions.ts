import type { SpaceReaction } from '~/types/api'

export type FloatingReaction = {
  key: string
  emoji: string
  /** Optional CSS color value applied to the floating element. */
  color?: string
}

const REACTIONS_KEY = 'space-reactions'

export function useSpaceReactions() {
  const { apiFetchData } = useApiClient()

  const reactions = useState<SpaceReaction[]>(REACTIONS_KEY, () => [])

  async function loadReactions() {
    if (reactions.value.length) return
    try {
      const data = await apiFetchData<SpaceReaction[]>('/spaces/reactions', { method: 'GET' })
      if (Array.isArray(data)) reactions.value = data
    } catch {
      // Non-critical: reactions are optional UI.
    }
  }

  const floatingByUserId = useState<Map<string, FloatingReaction[]>>('space-reactions-floating', () => new Map())

  function removeFloating(userId: string, key: string) {
    const current = floatingByUserId.value.get(userId) ?? []
    const next = current.filter((r) => r.key !== key)
    const nextMap = new Map(floatingByUserId.value)
    if (next.length) nextMap.set(userId, next)
    else nextMap.delete(userId)
    floatingByUserId.value = nextMap
  }

  function addFloating(userIdRaw: string, emojiRaw: string, color?: string) {
    const userId = String(userIdRaw ?? '').trim()
    const emoji = String(emojiRaw ?? '').trim()
    if (!userId || !emoji) return

    const key = `${userId}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const current = floatingByUserId.value.get(userId) ?? []
    const nextMap = new Map(floatingByUserId.value)
    nextMap.set(userId, [...current, { key, emoji, color }])
    floatingByUserId.value = nextMap

    // Keep in sync with CSS animation duration.
    setTimeout(() => removeFloating(userId, key), 1800)
  }

  function getFloating(userIdRaw: string): FloatingReaction[] {
    const userId = String(userIdRaw ?? '').trim()
    if (!userId) return []
    return floatingByUserId.value.get(userId) ?? []
  }

  function clearAllFloating() {
    floatingByUserId.value = new Map()
  }

  function extractEmojis(text: string): string[] {
    if (typeof Intl !== 'undefined' && (Intl as any).Segmenter) {
      const segmenter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' })
      const segments: { segment: string }[] = [...segmenter.segment(text)]
      return segments.map((s) => s.segment).filter((s) => /\p{Extended_Pictographic}/u.test(s))
    }
    return [...(text.match(/\p{Extended_Pictographic}/gu) ?? [])]
  }

  function addFloatingEmojisFromText(userId: string, text: string, delayMs = 320) {
    const uid = String(userId ?? '').trim()
    const body = String(text ?? '').trim()
    if (!uid || !body) return
    const emojis = extractEmojis(body).slice(0, 6)
    emojis.forEach((emoji, i) => {
      setTimeout(() => addFloating(uid, emoji), i * delayMs)
    })
  }

  return { reactions, loadReactions, addFloating, addFloatingEmojisFromText, getFloating, clearAllFloating }
}

