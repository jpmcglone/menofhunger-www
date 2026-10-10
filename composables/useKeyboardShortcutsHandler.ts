import type { ShortcutAction } from '~/composables/useKeyboardShortcuts'
import { MOH_SHORTCUT_ACTIONS_KEY, type ShortcutMediaActions } from '~/utils/keyboard-shortcuts'

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
  const { cycleTheme } = useThemeCycle()
  const { toggle: toggleRadio } = useSpaceAudio()

  function profileRoute() {
    return user.value?.username ? `/u/${encodeURIComponent(user.value.username)}` : '/settings'
  }

  const routes: Partial<Record<ShortcutAction, () => string>> = {
    home: () => '/home', explore: () => '/explore', notifications: () => '/notifications',
    chat: () => '/chat', spaces: () => '/spaces', groups: () => '/groups',
    bookmarks: () => '/bookmarks', profile: profileRoute, onlyMe: () => '/only-me',
    radio: () => '/radio', settings: () => '/settings',
  }
  const G_KEY_MAP: Record<string, ShortcutAction> = {
    H: 'home', E: 'explore', N: 'notifications', C: 'chat', S: 'spaces',
    G: 'groups', B: 'bookmarks', P: 'profile', M: 'onlyMe', R: 'radio',
  }

  function routeFor(action: ShortcutAction) {
    return routes[action]?.()
  }

  function execute(action: ShortcutAction, media: ShortcutMediaActions = {}) {
    const route = routeFor(action)
    if (route) {
      void router.push(route)
      return
    }
    switch (action) {
      case 'search': opts.focusSearch?.(); break
      case 'compose': opts.openComposer?.(); break
      case 'nextPost': focusNext(); break
      case 'previousPost': focusPrev(); break
      case 'reply': replyToFocused(); break
      case 'previousMedia': media.previousMedia?.(); break
      case 'nextMedia': media.nextMedia?.(); break
      case 'toggleRadio': toggleRadio(); break
      case 'theme': cycleTheme(); break
      case 'dismiss': showModal.value = false; break
      case 'shortcuts': showModal.value = !showModal.value; break
    }
  }

  provide(MOH_SHORTCUT_ACTIONS_KEY, { routeFor, execute })

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
    // Web Components (e.g. emoji-picker-element) host their inputs inside a
    // shadow root. document.activeElement points at the host, not the inner
    // input, so we also check the shadow-root's active element.
    const shadowActive = el.shadowRoot?.activeElement
    if (shadowActive instanceof HTMLElement) {
      const shadowTag = shadowActive.tagName.toLowerCase()
      if (shadowTag === 'input' || shadowTag === 'textarea' || shadowTag === 'select') return true
      if (shadowActive.isContentEditable) return true
    }
    return false
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return

    // '?' toggles the shortcuts modal — but not when typing in a text field.
    if (e.key === '?' && !isEditableElement(document.activeElement)) {
      e.preventDefault()
      clearPendingG()
      execute('shortcuts')
      return
    }

    // When the shortcuts modal is open, suppress all other shortcuts.
    if (showModal.value) return

    // All shortcuts (including G+X sequences) must not fire in editable elements.
    if (isEditableElement(document.activeElement)) {
      clearPendingG()
      return
    }

    // Complete a pending G+X sequence.
    if (pendingG) {
      clearPendingG()
      const key = e.key.toUpperCase()
      const action = G_KEY_MAP[key]
      if (action) {
        e.preventDefault()
        execute(action)
      }
      return
    }

    if (e.key === 'g' || e.key === 'G') {
      e.preventDefault()
      pendingG = true
      pendingGTimer = setTimeout(clearPendingG, 800)
      return
    }

    if (e.key === '/') {
      e.preventDefault()
      execute('search')
      return
    }

    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault()
      execute('compose')
      return
    }

    if (e.key === 'j' || e.key === 'J') {
      e.preventDefault()
      execute('nextPost')
      return
    }

    if (e.key === 'k' || e.key === 'K') {
      e.preventDefault()
      execute('previousPost')
      return
    }

    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault()
      execute('reply')
      return
    }

    // '<' (Shift+,) — Settings
    if (e.key === '<') {
      e.preventDefault()
      execute('settings')
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
