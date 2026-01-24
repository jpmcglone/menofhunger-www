export default defineNuxtPlugin(() => {
  const colorMode = useColorMode()

  const isEditableTarget = (t: EventTarget | null) => {
    const el = t as HTMLElement | null
    if (!el) return false
    const tag = el.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
    if ((el as HTMLElement).isContentEditable) return true
    return false
  }

  const getPref = () => (colorMode.preference || 'system') as 'system' | 'dark' | 'light'
  const nextPref = (p: 'system' | 'dark' | 'light'): 'system' | 'dark' | 'light' => {
    // Cycle order: system → dark → light → system
    if (p === 'system') return 'dark'
    if (p === 'dark') return 'light'
    return 'system'
  }

  const onKeydown = (e: KeyboardEvent) => {
    // Shortcut: Cmd/Ctrl + Shift + .
    // Use `code` so it works even when shift changes the printed key (e.g. '>' vs '.').
    const isCombo = (e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && e.code === 'Period'
    if (!isCombo) return
    if (isEditableTarget(e.target)) return

    e.preventDefault()
    colorMode.preference = nextPref(getPref())
  }

  if (import.meta.client) {
    window.addEventListener('keydown', onKeydown, { passive: false })
  }

  // Best-effort cleanup (mainly for HMR in dev)
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window.removeEventListener('keydown', onKeydown)
    })
  }
})

