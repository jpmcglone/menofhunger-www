import { useDesktopChatDock } from '~/composables/chat/useDesktopChatDock'

/** Measure actual overlay clearance; never cover the chat dock to display an optional toast. */
export function useActivityToastRoom() {
  const dock = useDesktopChatDock()
  const available = ref(false)
  let observer: ResizeObserver | undefined
  let frame = 0
  function measure() {
    if (!import.meta.client) return
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      const rects = [...document.querySelectorAll<HTMLElement>('.moh-chat-dock, .moh-chat-dock-window, [data-chat-session-key]')]
        .filter(element => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden')
        .map(element => element.getBoundingClientRect())
        .filter(rect => rect.width > 0 && rect.height > 0 && rect.bottom > innerHeight - 320)
      const leftmost = rects.length ? Math.min(...rects.map(rect => rect.left)) : innerWidth
      available.value = dock.desktop.value && innerHeight >= 520 && leftmost >= 24 + 352 + 16
    })
  }
  onMounted(() => {
    observer = new ResizeObserver(measure)
    observer.observe(document.body)
    const root = document.querySelector('.moh-chat-dock')
    if (root) observer.observe(root)
    window.addEventListener('resize', measure)
    measure()
  })
  watch([dock.desktop, dock.sessions, dock.listExpanded, dock.fullHostReady], () => { void nextTick(measure) }, { deep: true })
  onBeforeUnmount(() => {
    observer?.disconnect()
    window.removeEventListener('resize', measure)
    cancelAnimationFrame(frame)
  })
  return available
}
