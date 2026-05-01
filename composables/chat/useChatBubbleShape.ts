import type { Message } from '~/types/api'

/**
 * Bubble-shape heuristic for chat messages. Pure render-time function — no
 * `ResizeObserver`, no per-bubble registration, no DOM measurement.
 *
 * Replaces an earlier ResizeObserver-driven implementation that
 * `getBoundingClientRect()`-measured every visible bubble and cloned a Map on
 * every shape transition. With many messages on screen that produced hundreds
 * of forced layouts and hundreds of reactive notifications per keyboard /
 * window resize tick. The measurement approach is also unnecessary once the
 * message list is virtualized — we already know the body string at render
 * time, and a length-based bucket gets ~95% of the visual quality at zero
 * CPU cost.
 *
 * Heuristic:
 *   - "pill" if body is short, has no newline, no reply snippet, no media,
 *     and isn't a tombstone ("deleted for me / for everyone").
 *   - "rect" otherwise.
 *
 * Tested in `tests/chat/pick-bubble-shape.test.ts`.
 */

export const PILL_MAX_CHARS = 42

const PILL_CLASS = 'rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2'
const RECT_CLASS = 'rounded-2xl p-2.5 sm:p-3'

export function pickBubbleShape(message: Message): 'pill' | 'rect' {
  if (message.deletedForMe || message.deletedForAll) return 'rect'
  if (message.replyTo) return 'rect'
  if (message.media && message.media.length > 0) return 'rect'
  const body = (message.body ?? '').trim()
  if (!body) return 'rect'
  if (body.includes('\n')) return 'rect'
  if (body.length > PILL_MAX_CHARS) return 'rect'
  return 'pill'
}

export function bubbleShapeClass(message: Message): string {
  return pickBubbleShape(message) === 'pill' ? PILL_CLASS : RECT_CLASS
}

/**
 * Thin compat-shim. Kept so existing call sites that destructure from the
 * composable don't break; new code should import `bubbleShapeClass`
 * directly.
 */
export function useChatBubbleShape() {
  return { bubbleShapeClass }
}
