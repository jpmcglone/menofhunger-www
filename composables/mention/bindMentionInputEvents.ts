/**
 * Wires the textarea/input events that drive mention autocomplete and returns the unbind function.
 * Navigation keys on keyup are ignored so arrowing through the popover does not reset the highlight.
 */
export function bindMentionInputEvents(
  el: HTMLTextAreaElement | HTMLInputElement,
  handlers: { onRecompute: () => void; onKeydown: (e: KeyboardEvent) => boolean; onBlur: () => void },
): () => void {
  const onKeyUp: EventListener = (evt) => {
    const key = (evt as KeyboardEvent).key
    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === 'Tab' || key === 'Escape') return
    handlers.onRecompute()
  }
  const onKeyDown: EventListener = (evt) => { handlers.onKeydown(evt as KeyboardEvent) }

  el.addEventListener('input', handlers.onRecompute)
  el.addEventListener('click', handlers.onRecompute)
  el.addEventListener('keyup', onKeyUp)
  el.addEventListener('keydown', onKeyDown)
  el.addEventListener('blur', handlers.onBlur)
  return () => {
    el.removeEventListener('input', handlers.onRecompute)
    el.removeEventListener('click', handlers.onRecompute)
    el.removeEventListener('keyup', onKeyUp)
    el.removeEventListener('keydown', onKeyDown)
    el.removeEventListener('blur', handlers.onBlur)
  }
}
