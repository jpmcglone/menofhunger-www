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
    mounted.value = true
    await nextTick()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(menuRef.value as any)?.toggle?.(event)
  }

  return { mounted, menuRef, toggle }
}
