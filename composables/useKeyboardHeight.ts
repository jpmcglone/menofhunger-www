import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Minimal shape of the VirtualKeyboard API (Chromium-only, not in lib.dom yet).
 * See https://developer.mozilla.org/en-US/docs/Web/API/VirtualKeyboard_API
 */
interface VirtualKeyboardLike extends EventTarget {
  overlaysContent: boolean
  boundingRect: DOMRectReadOnly
}

function getVirtualKeyboard(): VirtualKeyboardLike | null {
  if (typeof navigator === 'undefined') return null
  return (navigator as Navigator & { virtualKeyboard?: VirtualKeyboardLike }).virtualKeyboard ?? null
}

/**
 * Tracks the software keyboard height.
 *
 * Two mechanisms are required because our viewport meta sets
 * `interactive-widget=overlays-content`, which means "resize *neither* viewport":
 *
 * - **Chromium (incl. Android Chrome/Brave)** honors that flag, so `visualViewport.height`
 *   does NOT shrink when the keyboard opens and the subtraction below always yields 0.
 *   These are exactly the browsers that expose the VirtualKeyboard API, which reports the
 *   keyboard rectangle directly — so we use that when present.
 * - **iOS Safari** does not implement `interactive-widget` and shrinks the visual viewport
 *   on its own, so the `visualViewport` math is correct there.
 *
 * Desktop stays at 0 under both paths (no virtual keyboard to report).
 */
export function useKeyboardHeight() {
  const keyboardHeight = ref(0)

  // Both signals are read and the larger wins, rather than branching on feature
  // detection. Whichever mechanism a browser actually implements reports the real
  // height while the other reports 0, so the max is correct everywhere and stays
  // correct if a browser exposes the VirtualKeyboard API without populating it.
  function update() {
    const vv = window.visualViewport
    const fromViewport = vv ? window.innerHeight - vv.height - vv.offsetTop : 0
    const fromVirtualKeyboard = getVirtualKeyboard()?.boundingRect.height ?? 0
    keyboardHeight.value = Math.round(Math.max(0, fromViewport, fromVirtualKeyboard))
  }

  onMounted(() => {
    if (!import.meta.client) return

    const vk = getVirtualKeyboard()
    if (vk) {
      // Opt in to geometry reporting. This matches what the viewport meta already
      // declares, so it is not a behavior change — it just makes the height readable.
      vk.overlaysContent = true
      vk.addEventListener('geometrychange', update)
    }

    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    update()
  })

  onUnmounted(() => {
    if (!import.meta.client) return

    getVirtualKeyboard()?.removeEventListener('geometrychange', update)
    window.visualViewport?.removeEventListener('resize', update)
    window.visualViewport?.removeEventListener('scroll', update)
  })

  return { keyboardHeight }
}
