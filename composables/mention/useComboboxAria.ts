import type { Ref } from 'vue'

/** Best-effort combobox semantics for assistive tech on the input that owns a listbox popover. */
export function useComboboxAria(
  el: Ref<HTMLTextAreaElement | HTMLInputElement | null>,
  state: { open: Ref<boolean>; listboxId: string; activeDescendantId: Ref<string | null> },
) {
  watchEffect(() => {
    if (!import.meta.client) return
    const target = el.value
    if (!target) return

    // These are safe on both <input> and <textarea>.
    try {
      target.setAttribute('aria-autocomplete', 'list')
      target.setAttribute('aria-haspopup', 'listbox')
      target.setAttribute('aria-expanded', state.open.value ? 'true' : 'false')

      if (state.open.value) target.setAttribute('aria-controls', state.listboxId)
      else target.removeAttribute('aria-controls')

      const activeId = state.activeDescendantId.value
      if (state.open.value && activeId) target.setAttribute('aria-activedescendant', activeId)
      else target.removeAttribute('aria-activedescendant')
    } catch {
      // ignore
    }
  })
}
