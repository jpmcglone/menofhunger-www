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
 * time, and estimating its width from the glyphs gets ~95% of the visual
 * quality at zero CPU cost.
 *
 * Heuristic:
 *   - "pill" if the body is narrow enough to fit one line, has no newline,
 *     no reply snippet, no media, and isn't a tombstone ("deleted for me /
 *     for everyone").
 *   - "rect" otherwise.
 *
 * Tested in `tests/chat/pick-bubble-shape.test.ts`.
 */

const WIDE_CHARS = new Set(['m', 'w', 'M', 'W', '@'])
const NARROW_CHARS = new Set([
  'i', 'l', 'j', 't', 'f', 'r', 'I', '.', ',', ':', ';', '!', '|', "'", '`', '(', ')', '[', ']', '-',
])

/**
 * Approximate advance width of `text`, in ems, for the app's sans stack.
 *
 * Character count is a poor proxy for rendered width — "mmmm" is about three
 * times as wide as "llll" — so a raw length cap does one of two wrong things:
 * lets wide text wrap inside a pill, or denies the pill to narrow text that
 * comfortably fits. ("btw group chats work here too" is 29 characters but
 * mostly narrow letters and spaces, and used to lose its pill by one char.)
 *
 * The buckets are coarse, but they order glyphs correctly, which is all the
 * shape decision needs. Stays pure — no DOM, no measurement.
 */
export function estimateTextEms(text: string): number {
  let ems = 0
  for (const ch of text) {
    if (ch === ' ') ems += 0.26
    else if (WIDE_CHARS.has(ch)) ems += 0.92
    else if (NARROW_CHARS.has(ch)) ems += 0.3
    else if (ch >= '0' && ch <= '9') ems += 0.56
    else if (ch >= 'A' && ch <= 'Z') ems += 0.68
    // Emoji and CJK render close to full-width; without this they'd be badly
    // underestimated and a pill would wrap.
    else if ((ch.codePointAt(0) ?? 0) > 0x2e80) ems += 1
    else ems += 0.53
  }
  return ems
}

/**
 * Pill budget for a bubble with no inline timestamp, in ems of body text.
 * Calibrated to the narrowest supported chat column (bubbles cap at 85% of it).
 */
export const PILL_MAX_EMS = 22

/**
 * Same budget minus the inline timestamp tail. A rendered "3:44 PM ✓" plus its
 * left margin eats roughly 7em of the line, so the body gets what's left. This
 * keeps a float-right timestamp from forcing a wrap inside a pill bubble.
 */
export const PILL_MAX_EMS_WITH_META = 15

export const PILL_CLASS = 'rounded-full px-3.5 py-1.5 sm:px-4 sm:py-2'
export const RECT_CLASS = 'rounded-2xl p-2.5 sm:p-3'

export function pickBubbleShape(message: Message): 'pill' | 'rect' {
  if (message.deletedForMe || message.deletedForAll) return 'rect'
  if (message.replyTo) return 'rect'
  if (message.media && message.media.length > 0) return 'rect'
  const body = (message.body ?? '').trim()
  if (!body) return 'rect'
  if (body.includes('\n')) return 'rect'
  if (estimateTextEms(body) > PILL_MAX_EMS) return 'rect'
  // Any URL in the body will render a link preview card below the text,
  // making the bubble tall — pill corners look wrong on tall bubbles.
  if (/https?:\/\//i.test(body)) return 'rect'
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
