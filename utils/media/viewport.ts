/** Scroll containers define the selection center; card clipping only limits visible pixels. */
export function measureVideo(el: HTMLElement): { distance: number } | null {
  if (!el.isConnected || el.closest('[inert], [aria-hidden="true"]')) return null
  const box = el.getBoundingClientRect()
  if (box.height <= 0 || box.width <= 0) return null
  const vv = window.visualViewport
  let top = vv?.offsetTop ?? 0
  let bottom = top + (vv?.height ?? window.innerHeight)
  let left = vv?.offsetLeft ?? 0
  let right = left + (vv?.width ?? window.innerWidth)
  const clips: DOMRect[] = []
  for (let parent: HTMLElement | null = el; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent)
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return null
    if (parent === el) continue
    const overflow = style.overflowY + style.overflowX + style.overflow
    if (/(auto|scroll|hidden|clip)/.test(overflow)) clips.push(parent.getBoundingClientRect())
    if (/(auto|scroll)/.test(overflow)) {
      const viewport = parent.getBoundingClientRect()
      top = Math.max(top, viewport.top); bottom = Math.min(bottom, viewport.bottom)
      left = Math.max(left, viewport.left); right = Math.min(right, viewport.right)
    }
  }
  for (const chrome of document.querySelectorAll<HTMLElement>('[data-media-occluder]')) {
    const r = chrome.getBoundingClientRect()
    if (r.right <= left || r.left >= right || r.height <= 0) continue
    if (r.top <= top + 1 && r.bottom > top) top = r.bottom
    else if (r.bottom >= bottom - 1 && r.top < bottom) bottom = r.top
  }
  const visibleTop = Math.max(top, box.top, ...clips.map(r => r.top))
  const visibleBottom = Math.min(bottom, box.bottom, ...clips.map(r => r.bottom))
  const visibleLeft = Math.max(left, box.left, ...clips.map(r => r.left))
  const visibleRight = Math.min(right, box.right, ...clips.map(r => r.right))
  if (bottom <= top || visibleBottom - visibleTop < Math.min(box.height, bottom - top) * 0.75 || visibleRight <= visibleLeft) return null
  const hit = document.elementFromPoint?.((visibleLeft + visibleRight) / 2, (visibleTop + visibleBottom) / 2)
  if (hit && !el.contains(hit) && !hit.contains(el)) return null
  return { distance: Math.abs((box.top + box.bottom) / 2 - (top + bottom) / 2) }
}
