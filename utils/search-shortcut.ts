/** Find an enabled search input that is actually visible, including its ancestors. */
export function focusVisibleSearchInput(): boolean {
  for (const input of document.querySelectorAll<HTMLInputElement>('[data-moh-search-input]')) {
    if (input.disabled || input.closest('[inert]') || input.getClientRects().length === 0) continue
    let visible = true
    for (let element: HTMLElement | null = input; element; element = element.parentElement) {
      const style = getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        visible = false
        break
      }
    }
    if (!visible) continue
    input.focus()
    return document.activeElement === input
  }
  return false
}

/** Also retry at Nuxt's page-finish hook when a lazy page renders after navigation. */
export function createSearchShortcut(options: {
  navigate: () => Promise<unknown>
  nextRender: () => Promise<unknown>
  onPageFinished: (callback: () => void) => () => void
}) {
  let unsubscribe: (() => void) | undefined
  function dispose() {
    unsubscribe?.()
    unsubscribe = undefined
  }
  async function focus() {
    dispose()
    if (focusVisibleSearchInput()) return
    unsubscribe = options.onPageFinished(() => {
      focusVisibleSearchInput()
      dispose()
    })
    try {
      const failure = await options.navigate()
      await options.nextRender()
      if (focusVisibleSearchInput() || failure) dispose()
    } catch {
      dispose()
    }
  }
  return { focus, dispose }
}
