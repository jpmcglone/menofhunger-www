import type { Ref } from 'vue'
import { onMounted, onUnmounted, watch } from 'vue'
import { useKeyboardHeight } from '~/composables/useKeyboardHeight'

const DEFAULT_PADDING_PX = 16

function isEditableElement(el: Element | null): el is HTMLElement {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  return tag === 'TEXTAREA' || (tag === 'INPUT' && (el as HTMLInputElement).type !== 'hidden')
}

/**
 * Scroll `scroller` the minimum amount so `el` sits fully inside its visible area
 * (with padding). No-op when already visible.
 */
export function scrollElementIntoScroller(
  scroller: HTMLElement,
  el: HTMLElement,
  padding = DEFAULT_PADDING_PX,
  behavior: ScrollBehavior = 'smooth',
): void {
  const scrollerRect = scroller.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const relTop = elRect.top - scrollerRect.top
  const relBottom = elRect.bottom - scrollerRect.top
  const viewHeight = scroller.clientHeight

  if (relTop < padding) {
    scroller.scrollBy({ top: relTop - padding, behavior })
  } else if (relBottom > viewHeight - padding) {
    scroller.scrollBy({ top: relBottom - viewHeight + padding, behavior })
  }
}

/**
 * Keep the focused text input / contenteditable visible inside `#moh-middle-scroller`
 * when the software keyboard opens.
 *
 * Chat does not need this: its composer is flex-anchored to the bottom of the
 * keyboard-shrunk shell. Inline composers (post permalink reply, article comments)
 * live mid-scroller — when the shell shrinks, nothing re-scrolls them into the
 * new visible height unless we do it here.
 *
 * Call once from the app layout with the middle scroller ref.
 */
export function useEnsureFocusedInputVisible(
  scrollerRef: Ref<HTMLElement | null>,
  opts?: { padding?: number },
) {
  const padding = opts?.padding ?? DEFAULT_PADDING_PX
  const { keyboardHeight } = useKeyboardHeight()

  let raf1 = 0
  let raf2 = 0

  function scheduleEnsure() {
    if (!import.meta.client) return
    cancelAnimationFrame(raf1)
    cancelAnimationFrame(raf2)
    // Double rAF: wait for the shell pin / scroller resize to commit before measuring.
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const scroller = scrollerRef.value
        if (!scroller) return
        const active = document.activeElement
        if (!isEditableElement(active)) return
        if (!scroller.contains(active)) return
        scrollElementIntoScroller(scroller, active, padding)
      })
    })
  }

  function onFocusIn(event: FocusEvent) {
    const target = event.target
    if (!(target instanceof Element)) return
    const scroller = scrollerRef.value
    if (!scroller?.contains(target)) return
    if (!isEditableElement(target) && !target.closest('[contenteditable="true"]')) return
    scheduleEnsure()
  }

  onMounted(() => {
    if (!import.meta.client) return
    document.addEventListener('focusin', onFocusIn)
  })

  onUnmounted(() => {
    if (!import.meta.client) return
    document.removeEventListener('focusin', onFocusIn)
    cancelAnimationFrame(raf1)
    cancelAnimationFrame(raf2)
  })

  // Keyboard often finishes opening *after* focus; re-run when height changes.
  watch(keyboardHeight, (h, prev) => {
    if (h === prev) return
    if (h <= 0) return
    scheduleEnsure()
  })
}
