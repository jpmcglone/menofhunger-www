/** A short spatial handoff between the persistent workspace and its avatar. */
export function animateChatDock(from: DOMRect, target: HTMLElement, restoring: boolean, finished: () => void) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !target.animate || !from.width || !from.height) return null
  const to = target.getBoundingClientRect()
  if (!to.width || !to.height) return null
  let ghost: HTMLDivElement | undefined
  let animation: Animation
  if (restoring) {
    animation = target.animate([
      { transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${from.width / to.width}, ${from.height / to.height})`, opacity: 0.25, borderRadius: '28px' },
      { transform: 'none', opacity: 1, borderRadius: '12px' },
    ], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' })
    target.style.transformOrigin = 'top left'
  } else {
    ghost = document.createElement('div')
    ghost.setAttribute('aria-hidden', 'true')
    Object.assign(ghost.style, { position: 'fixed', left: `${from.x}px`, top: `${from.y}px`, width: `${from.width}px`, height: `${from.height}px`, background: 'var(--moh-surface-2)', border: '1px solid var(--moh-border)', borderRadius: '12px', pointerEvents: 'none', zIndex: '46', transformOrigin: 'top left', boxShadow: '0 8px 24px rgb(0 0 0 / 25%)' })
    document.body.append(ghost)
    animation = ghost.animate([
      { transform: 'none', opacity: 0.85, borderRadius: '12px' },
      { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(${to.width / from.width}, ${to.height / from.height})`, opacity: 0, borderRadius: '28px' },
    ], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' })
  }
  const cleanup = () => { animation.cancel(); ghost?.remove(); finished() }
  void animation.finished.then(cleanup, () => { ghost?.remove(); finished() })
  return cleanup
}
