import { ref, onMounted, onUnmounted } from 'vue'

/**
 * Tracks the software keyboard height on mobile using the visualViewport API.
 *
 * Requires `interactive-widget=overlays-content` in the viewport meta tag so that
 * the keyboard overlays the layout viewport rather than resizing it. With that flag,
 * `visualViewport.height` shrinks by exactly the keyboard height while
 * `window.innerHeight` stays stable — so the difference is the keyboard height.
 *
 * Safe to use on desktop (keyboard height stays 0).
 */
export function useKeyboardHeight() {
  const keyboardHeight = ref(0)

  function update() {
    if (!window.visualViewport) return
    const kb = Math.max(0, window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop)
    keyboardHeight.value = Math.round(kb)
  }

  onMounted(() => {
    if (!import.meta.client || !window.visualViewport) return
    window.visualViewport.addEventListener('resize', update)
    window.visualViewport.addEventListener('scroll', update)
    update()
  })

  onUnmounted(() => {
    if (!import.meta.client || !window.visualViewport) return
    window.visualViewport.removeEventListener('resize', update)
    window.visualViewport.removeEventListener('scroll', update)
  })

  return { keyboardHeight }
}
