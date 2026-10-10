import { isDesktopChatDevice, openDockDraft, openDockSession, type DockSession } from '~/utils/chat-dock'
import type { FollowListUser } from '~/types/api'

/** Shell-owned session identity. DOM/media/message state stays in its keyed, mounted workspace. */
export function useDesktopChatDock() {
  const width = useState('chat-dock-width', () => 0)
  const finePointer = useHydratedMediaQuery('(pointer: fine)')
  const desktop = computed(() => import.meta.client && isDesktopChatDevice(width.value, finePointer.value, navigator.userAgent, navigator.platform, navigator.maxTouchPoints))
  const capacity = computed(() => width.value >= 1440 ? 2 : 1)
  const sessions = useState<DockSession[]>('chat-dock-sessions', () => [])
  const listExpanded = useState('chat-dock-list-expanded', () => false)
  const popupsPaused = useState('chat-dock-popups-paused', () => false)
  const fullHostReady = useState('chat-dock-full-host-ready', () => false)
  const focusedKey = useState<string | null>('chat-dock-focused-key', () => null)

  function open(key: string, automatic = false) {
    sessions.value = openDockSession(sessions.value, key, capacity.value, automatic)
  }
  function openDraft(recipients: FollowListUser[]) {
    const opened = openDockDraft(sessions.value, recipients, capacity.value)
    sessions.value = opened.sessions
    return opened.key
  }
  function setMode(key: string, mode: DockSession['mode']) {
    const nextMode = sessions.value.find(session => session.key === key)?.marv && mode === 'closed' ? 'minimized' : mode
    sessions.value = sessions.value.map(session => session.key === key ? { ...session, mode: nextMode } : session)
    if (nextMode !== 'expanded' && focusedKey.value === key) focusedKey.value = null
  }
  function reset() {
    sessions.value = []
    listExpanded.value = false
    focusedKey.value = null
    popupsPaused.value = false
  }
  return { width, desktop, capacity, sessions, listExpanded, popupsPaused, fullHostReady, focusedKey, open, openDraft, setMode, reset }
}
