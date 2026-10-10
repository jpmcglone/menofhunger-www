export default defineNuxtPlugin(() => {
  const { cycleTheme } = useThemeCycle()

  const isEditableTarget = (t: EventTarget | null) => {
    const el = t as HTMLElement | null
    if (!el) return false
    const tag = el.tagName?.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
    if ((el as HTMLElement).isContentEditable) return true
    return false
  }

  const onKeydown = (e: KeyboardEvent) => {
    // Shortcut: Cmd/Ctrl + Shift + .
    // Use `code` so it works even when shift changes the printed key (e.g. '>' vs '.').
    const isCombo = (e.metaKey || e.ctrlKey) && e.shiftKey && !e.altKey && e.code === 'Period'
    if (!isCombo) return
    if (isEditableTarget(e.target)) return

    e.preventDefault()
    cycleTheme()
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

