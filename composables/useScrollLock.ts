import type { Ref } from 'vue'

/**
 * Locks document scroll when the given condition is true.
 * Restores previous overflow on cleanup or when condition becomes false.
 * Use for modals/overlays so background content doesn't scroll.
 */
type RestoreState = {
  scrollY: number
  htmlOverflow: string
  bodyOverflow: string
  bodyPosition: string
  bodyTop: string
  bodyLeft: string
  bodyRight: string
  bodyWidth: string
  bodyPaddingRight: string
}

let lockCount = 0
let restoreState: RestoreState | null = null

function clearScrollLockStylesIfPresent() {
  if (!import.meta.client) return
  // Only clear when we *believe* nothing is locked.
  if (lockCount !== 0) return

  const html = document.documentElement
  const body = document.body

  // If the app was backgrounded/killed while locked, iOS standalone can restore the page with
  // `position: fixed` still applied on <body>, which shifts the entire UI on next launch.
  const looksLocked =
    html.style.overflow === 'hidden' ||
    body.style.overflow === 'hidden' ||
    body.style.position === 'fixed' ||
    (body.style.top ?? '').trim() !== ''

  if (!looksLocked) return

  html.style.overflow = ''
  body.style.overflow = ''
  body.style.position = ''
  body.style.top = ''
  body.style.left = ''
  body.style.right = ''
  body.style.width = ''
  body.style.paddingRight = ''
}

let didInitScrollLockFailsafe = false
if (import.meta.client && !didInitScrollLockFailsafe) {
  didInitScrollLockFailsafe = true
  window.addEventListener('pageshow', () => clearScrollLockStylesIfPresent(), { passive: true })
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState === 'visible') clearScrollLockStylesIfPresent()
    },
    { passive: true },
  )
}

export function lockBodyScroll() {
  if (!import.meta.client) return
  lockCount += 1
  if (lockCount > 1) return

  // Defensive: ensure we aren't starting from a stuck locked state.
  clearScrollLockStylesIfPresent()

  const html = document.documentElement
  const body = document.body

  const scrollY = window.scrollY || 0
  const scrollbarW = Math.max(0, window.innerWidth - html.clientWidth)

  restoreState = {
    scrollY,
    htmlOverflow: html.style.overflow,
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
    bodyPaddingRight: body.style.paddingRight,
  }

  // Prevent background scrolling reliably (incl. iOS Safari).
  html.style.overflow = 'hidden'
  body.style.overflow = 'hidden'
  body.style.position = 'fixed'
  body.style.top = `-${scrollY}px`
  body.style.left = '0'
  body.style.right = '0'
  body.style.width = '100%'
  if (scrollbarW > 0) body.style.paddingRight = `${scrollbarW}px`
}

export function unlockBodyScroll() {
  if (!import.meta.client) return
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount !== 0) return

  const html = document.documentElement
  const body = document.body
  const s = restoreState
  restoreState = null
  if (!s) return

  html.style.overflow = s.htmlOverflow
  body.style.overflow = s.bodyOverflow
  body.style.position = s.bodyPosition
  body.style.top = s.bodyTop
  body.style.left = s.bodyLeft
  body.style.right = s.bodyRight
  body.style.width = s.bodyWidth
  body.style.paddingRight = s.bodyPaddingRight

  // Restore scroll position after styles reset.
  window.scrollTo({ top: s.scrollY, behavior: 'auto' })
}

export function useScrollLock(isLocked: Ref<boolean>) {
  if (!import.meta.client) return

  let wasLocked = false
  watch(
    isLocked,
    (locked) => {
      if (locked && !wasLocked) {
        wasLocked = true
        lockBodyScroll()
        return
      }
      if (!locked && wasLocked) {
        wasLocked = false
        unlockBodyScroll()
      }
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    if (wasLocked) {
      wasLocked = false
      unlockBodyScroll()
    }
  })
}
