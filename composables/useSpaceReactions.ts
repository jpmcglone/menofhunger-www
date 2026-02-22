import type { SpaceReaction } from '~/types/api'

/**
 * Module-level resolver so any component (spaces page) can register avatar positions
 * and all addFloating calls (including those from useSpaceLiveChat) pick them up automatically.
 */
let _avatarPositionResolver: ((userId: string) => { x: number; y: number } | undefined) | null = null

export function registerAvatarPositionResolver(
  resolver: ((userId: string) => { x: number; y: number } | undefined) | null,
) {
  _avatarPositionResolver = resolver
}

/**
 * Resolver for the radio bar's listener stack avatars.
 * Used by the radio bar to register its own avatar lookup so bar floats start from
 * the correct position even when triggered optimistically from the spaces page.
 */
let _barPositionResolver: ((userId: string) => { x: number; y: number } | undefined) | null = null

export function registerBarPositionResolver(
  resolver: ((userId: string) => { x: number; y: number } | undefined) | null,
) {
  _barPositionResolver = resolver
}

export type FloatingReactionVariant = 'default' | 'bar'

export type FloatingReaction = {
  key: string
  emoji: string
  /** Optional CSS color value applied to the floating element. */
  color?: string
  /** Viewport center of the source avatar. When set, rendered in the fullscreen Teleport overlay. */
  startX?: number
  startY?: number
  /** Peak horizontal drift (px, signed). Emoji arcs smoothly to this side then slightly back. */
  sway: number
  /** Mid-point opacity (0–1) — controls how quickly the emoji fades out. */
  opacityMid: number
  /** Controls which CSS animation class is applied in the Teleport overlay. */
  variant: FloatingReactionVariant
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

  function rnd(min: number, max: number) {
    return min + Math.random() * (max - min)
  }

  /**
   * @param pos      Viewport center of the avatar. When provided the emoji floats up from that
   *                 point; otherwise falls back to the registered position resolver.
   * @param color    Optional CSS color for the emoji.
   * @param variant  'default' uses the full-screen dramatic arc; 'bar' uses the short fast animation.
   */
  function addFloating(
    userIdRaw: string,
    emojiRaw: string,
    pos?: { x: number; y: number },
    color?: string,
    variant: FloatingReactionVariant = 'default',
  ) {
    const userId = String(userIdRaw ?? '').trim()
    const emoji = String(emojiRaw ?? '').trim()
    if (!userId || !emoji) return

    const resolver = variant === 'bar' ? _barPositionResolver : _avatarPositionResolver
    const resolvedPos = pos ?? resolver?.(userId)
    const key = `${userId}-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const float: FloatingReaction = {
      key,
      emoji,
      color,
      startX: resolvedPos?.x,
      startY: resolvedPos?.y,
      sway: rnd(-32, 32),
      opacityMid: rnd(0.55, 0.95),
      variant,
    }
    const current = floatingByUserId.value.get(userId) ?? []
    const nextMap = new Map(floatingByUserId.value)
    nextMap.set(userId, [...current, float])
    floatingByUserId.value = nextMap

    // Timeout matches the CSS animation duration for each variant.
    const durationMs = variant === 'bar' ? 1000 : 1900
    setTimeout(() => removeFloating(userId, key), durationMs)
  }

  /** All floating reactions that have a viewport position (rendered by the fullscreen overlay). */
  const allPositionedFloating = computed<FloatingReaction[]>(() => {
    const result: FloatingReaction[] = []
    for (const floats of floatingByUserId.value.values()) {
      for (const f of floats) {
        if (f.startX !== undefined && f.startY !== undefined) result.push(f)
      }
    }
    return result
  })

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

  return { reactions, loadReactions, addFloating, addFloatingEmojisFromText, getFloating, allPositionedFloating, clearAllFloating }
}

