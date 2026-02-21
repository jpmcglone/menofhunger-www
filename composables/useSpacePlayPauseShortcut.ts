/**
 * Registers a Space-key shortcut to toggle space audio play/pause when a station
 * is active. Ignores the key when focus is in an input, textarea, or contenteditable.
 */
export function useSpacePlayPauseShortcut(enabled: MaybeRefOrGetter<boolean>) {
  const { toggle } = useSpaceAudio()

  function isEditableElement(el: EventTarget | null): boolean {
    if (!el || !(el instanceof HTMLElement)) return false
    const tag = el.tagName.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
    if (el.isContentEditable) return true
    return false
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== ' ' || !unref(enabled)) return
    if (isEditableElement(e.target as HTMLElement)) return
    e.preventDefault()
    toggle()
  }

  onMounted(() => {
    if (!import.meta.client) return
    document.addEventListener('keydown', onKeydown, { capture: true })
  })

  onBeforeUnmount(() => {
    if (!import.meta.client) return
    document.removeEventListener('keydown', onKeydown, { capture: true })
  })
}
