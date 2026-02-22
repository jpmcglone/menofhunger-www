export type KeyboardShortcutsHandlerOptions = {
  openComposer?: () => void
  focusSearch?: () => void
}

/**
 * Registers the global keyboard shortcut handler.
 * Call this exactly once from the app layout.
 */
export function useKeyboardShortcutsHandler(opts: KeyboardShortcutsHandlerOptions = {}) {
  const router = useRouter()
  const { user } = useAuth()
  const { showModal } = useKeyboardShortcuts()
  const { focusNext, focusPrev, replyToFocused } = useKeyboardShortcutsFocusedPost()

  function profileRoute() {
    return user.value?.username ? `/u/${encodeURIComponent(user.value.username)}` : '/settings'
  }

  const G_KEY_MAP: Record<string, () => string> = {
    H: () => '/home',
    E: () => '/explore',
    N: () => '/notifications',
    C: () => '/chat',
    S: () => '/spaces',
    G: () => '/groups',
    B: () => '/bookmarks',
    P: () => profileRoute(),
    M: () => '/only-me',
    R: () => '/radio',
  }

  let pendingG = false
  let pendingGTimer: ReturnType<typeof setTimeout> | null = null

  function clearPendingG() {
    pendingG = false
    if (pendingGTimer) {
      clearTimeout(pendingGTimer)
      pendingGTimer = null
    }
  }

  function isEditableElement(el: Element | null): boolean {
    if (!el || !(el instanceof HTMLElement)) return false
    const tag = el.tagName.toLowerCase()
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
    if (el.isContentEditable) return true
    return false
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return

    // '?' always works regardless of focus context — toggles the shortcuts modal.
    if (e.key === '?') {
      e.preventDefault()
      showModal.value = !showModal.value
      return
    }

    // When the shortcuts modal is open, suppress all other shortcuts.
    if (showModal.value) return

    // Complete a pending G+X sequence.
    if (pendingG) {
      clearPendingG()
      const key = e.key.toUpperCase()
      const routeFn = G_KEY_MAP[key]
      if (routeFn) {
        e.preventDefault()
        void router.push(routeFn())
      }
      return
    }

    // All remaining shortcuts do not fire in editable elements.
    if (isEditableElement(document.activeElement)) return

    if (e.key === 'g' || e.key === 'G') {
      e.preventDefault()
      pendingG = true
      pendingGTimer = setTimeout(clearPendingG, 800)
      return
    }

    if (e.key === '/') {
      e.preventDefault()
      opts.focusSearch?.()
      return
    }

    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault()
      opts.openComposer?.()
      return
    }

    if (e.key === 'j' || e.key === 'J') {
      e.preventDefault()
      focusNext()
      return
    }

    if (e.key === 'k' || e.key === 'K') {
      e.preventDefault()
      focusPrev()
      return
    }

    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault()
      replyToFocused()
      return
    }

    // '<' (Shift+,) — Settings
    if (e.key === '<') {
      e.preventDefault()
      void router.push('/settings')
      return
    }
  }

  onMounted(() => {
    if (!import.meta.client) return
    document.addEventListener('keydown', onKeydown, { capture: true })
  })

  onBeforeUnmount(() => {
    clearPendingG()
    if (!import.meta.client) return
    document.removeEventListener('keydown', onKeydown, { capture: true })
  })
}
