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
 * Only coarse-pointer devices have a software keyboard. Gating the baseline path on this
 * keeps a desktop user dragging their window shorter from being read as "keyboard open".
 */
function hasCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(pointer: coarse)').matches === true
}

/**
 * Tracks the software keyboard height.
 *
 * Two mechanisms are required because our viewport meta sets
 * `interactive-widget=overlays-content`, which means "resize *neither* viewport":
 *
 * - **Chromium (incl. Android Chrome/Brave)** honors that flag, so `visualViewport.height`
 *   does NOT shrink when the keyboard opens. These are exactly the browsers that expose
 *   the VirtualKeyboard API, which reports the keyboard rectangle directly.
 * - **iOS Safari** ignores `interactive-widget` and shrinks the visual viewport itself,
 *   so the keyboard height is inferred from how far `visualViewport.height` has dropped
 *   below its keyboard-closed baseline.
 *
 * The baseline is the tallest viewport seen for the current width, rather than a second
 * live metric such as `window.innerHeight`. iOS reports `innerHeight` inconsistently — it
 * tracks the layout viewport when the document is scrollable but collapses onto the visual
 * viewport when it is not — so differencing the two silently returns 0 depending on whether
 * the page happens to have scrollable content. The baseline has no such coupling.
 *
 * Desktop stays at 0: the baseline path is gated behind a coarse pointer, and no desktop
 * browser reports a virtual keyboard rectangle.
 */
export function useKeyboardHeight() {
  const keyboardHeight = ref(0)
  /**
   * Live visual-viewport geometry, used to pin a `position: fixed` app shell to the
   * *visible* area. iOS anchors fixed elements to the layout viewport, so when the
   * keyboard opens and iOS slides the visual viewport down inside it, a fixed shell
   * is carried off the top of the screen. Binding top/height to these values keeps
   * the shell aligned with what the user can actually see.
   *
   * Both stay 0 until the first client-side measurement, which callers use as the
   * "not measured yet" signal so SSR and hydration render identical markup.
   */
  const viewportHeight = ref(0)
  const viewportOffsetTop = ref(0)

  // Tallest viewport seen at `baselineWidth` — i.e. the keyboard-closed height.
  let baselineHeight = 0
  let baselineWidth = 0

  // Both signals are read and the larger wins, rather than branching on feature
  // detection. Whichever mechanism a browser actually implements reports the real
  // height while the other reports 0, so the max is correct everywhere and stays
  // correct if a browser exposes the VirtualKeyboard API without populating it.
  function update() {
    const vv = window.visualViewport
    const width = Math.round(vv?.width ?? window.innerWidth)
    const height = Math.round(vv?.height ?? window.innerHeight)

    // Width changes on rotation and window resize but never when a keyboard opens,
    // so it is a safe trigger for re-learning the keyboard-closed height.
    if (width !== baselineWidth) {
      baselineWidth = width
      baselineHeight = 0
    }
    if (height > baselineHeight) baselineHeight = height

    const fromViewport = hasCoarsePointer() ? Math.max(0, baselineHeight - height) : 0
    const fromVirtualKeyboard = getVirtualKeyboard()?.boundingRect.height ?? 0
    keyboardHeight.value = Math.round(Math.max(0, fromViewport, fromVirtualKeyboard))

    if (vv) {
      viewportHeight.value = height
      viewportOffsetTop.value = Math.round(vv.offsetTop)
    }
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
    // iOS keeps nudging the document while the keyboard is open, which moves the
    // visual viewport without always firing a visualViewport event.
    window.addEventListener('scroll', update, { passive: true })
    update()
  })

  onUnmounted(() => {
    if (!import.meta.client) return

    getVirtualKeyboard()?.removeEventListener('geometrychange', update)
    window.visualViewport?.removeEventListener('resize', update)
    window.visualViewport?.removeEventListener('scroll', update)
    window.removeEventListener('scroll', update)
  })

  return { keyboardHeight, viewportHeight, viewportOffsetTop }
}
