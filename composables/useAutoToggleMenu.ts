/**
 * Composable for PrimeVue Menu popup toggle with lazy mount.
 * Defers mounting the Menu until the first toggle so it doesn't render in SSR
 * or waste DOM nodes until needed.
 */
export function useAutoToggleMenu() {
  const mounted = ref(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const menuRef = ref<any>(null)

  async function toggle(event: Event) {
    if (mounted.value && menuRef.value) {
      menuRef.value.toggle?.(event)
      return
    }
    // The browser clears `currentTarget` once dispatch ends, and PrimeVue anchors the popup
    // to it; pin it on the event before waiting for the lazy mount.
    const anchor = event.currentTarget
    mounted.value = true
    await nextTick()
    Object.defineProperty(event, 'currentTarget', { value: anchor, configurable: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(menuRef.value as any)?.toggle?.(event)
  }

  return { mounted, menuRef, toggle }
}
