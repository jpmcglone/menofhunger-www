export type CaretPoint = {
  left: number
  top: number
  height: number
}

function copyTextStyle(from: HTMLElement, to: HTMLElement) {
  const s = window.getComputedStyle(from)
  // Keep this intentionally small; only properties that affect text layout.
  to.style.fontFamily = s.fontFamily
  to.style.fontSize = s.fontSize
  to.style.fontWeight = s.fontWeight
  to.style.fontStyle = s.fontStyle
  to.style.letterSpacing = s.letterSpacing
  to.style.textTransform = s.textTransform
  to.style.textIndent = s.textIndent
  to.style.textRendering = s.textRendering
  to.style.lineHeight = s.lineHeight
  to.style.padding = s.padding
  to.style.border = s.border
  to.style.boxSizing = s.boxSizing
  to.style.whiteSpace = 'pre-wrap'
  // textarea uses break-word wrapping.
  ;(to.style as any).wordWrap = 'break-word'
  to.style.overflow = 'auto'
  to.style.width = s.width
}

/**
 * Best-effort caret coordinates for a textarea/input using a mirrored div technique.
 * Returns viewport coordinates suitable for `position: fixed`.
 */
export function getCaretPoint(
  el: HTMLTextAreaElement | HTMLInputElement,
  caretIndex: number,
): CaretPoint | null {
  if (!el) return null
  if (typeof window === 'undefined' || typeof document === 'undefined') return null

  const value = (el.value ?? '').toString()
  const caret = Math.max(0, Math.min(value.length, Math.floor(caretIndex || 0)))

  const mirror = document.createElement('div')
  mirror.setAttribute('aria-hidden', 'true')
  mirror.style.position = 'fixed'
  mirror.style.left = '0'
  mirror.style.top = '0'
  mirror.style.visibility = 'hidden'
  mirror.style.pointerEvents = 'none'
  mirror.style.zIndex = '-1'

  copyTextStyle(el as unknown as HTMLElement, mirror)

  // Place mirror over the element so layout matches (including transforms/zoom).
  const r = el.getBoundingClientRect()
  mirror.style.left = `${Math.floor(r.left)}px`
  mirror.style.top = `${Math.floor(r.top)}px`
  mirror.style.height = `${Math.floor(r.height)}px`

  // Text up to caret.
  const before = value.slice(0, caret)
  mirror.textContent = before

  // Marker span.
  const marker = document.createElement('span')
  marker.textContent = '\u200b'
  mirror.appendChild(marker)

  // Remaining text helps mirror compute wrapping the same way.
  const after = document.createElement('span')
  after.textContent = value.slice(caret)
  mirror.appendChild(after)

  document.body.appendChild(mirror)

  // Sync scroll offsets (important for multi-line / scrolled textareas).
  try {
    mirror.scrollTop = (el as HTMLTextAreaElement).scrollTop || 0
    mirror.scrollLeft = (el as HTMLTextAreaElement).scrollLeft || 0
  } catch {
    // ignore
  }

  const mr = marker.getBoundingClientRect()
  const lineHeight = parseFloat(window.getComputedStyle(el).lineHeight || '0') || 16

  document.body.removeChild(mirror)

  return {
    left: Math.floor(mr.left),
    top: Math.floor(mr.top),
    height: Math.max(10, Math.floor(lineHeight)),
  }
}

