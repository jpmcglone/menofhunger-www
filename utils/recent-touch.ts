/**
 * Tracks whether the most recent pointer interaction was a touch.
 * Browsers fire synthetic mouseenter/mousemove after touchend; this flag
 * lets hover-based UI suppress itself during those synthetic events.
 *
 * Usage: `import { isRecentTouch } from '~/utils/recent-touch'`
 *        then guard with `if (isRecentTouch()) return`
 */

let _recentTouch = false
let _timer: ReturnType<typeof setTimeout> | null = null

function onTouchStart() {
  _recentTouch = true
  if (_timer !== null) clearTimeout(_timer)
  _timer = setTimeout(() => { _recentTouch = false }, 600)
}

if (typeof window !== 'undefined') {
  window.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
}

export function isRecentTouch(): boolean {
  return _recentTouch
}
