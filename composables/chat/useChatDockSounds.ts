import { useActionSoundsEnabled } from '../useActionSounds'
import { useSfx } from '../useSfx'
import { useSoundPolicy } from '../useSoundPolicy'
import { SOUND_CATALOG } from '~/utils/sound-policy'
import { mediaFocus } from '~/utils/mediaFocus'

export type ChatDockSound = 'open' | 'minimize' | 'close'

export const CHAT_DOCK_SOUND_COOLDOWN_MS = 220
export const CHAT_DOCK_MIN_GAP_MS = 250
const MAX_PENDING_AGE_MS = 600
const lastPlayedAt = new Map<ChatDockSound, number>()
let lastAnyPlayedAt = 0

export function resetChatDockSoundPolicyForTests() {
  lastPlayedAt.clear()
  lastAnyPlayedAt = 0
}

/** User-action feedback for the desktop chat dock. Incoming messages use the existing presence cue. */
export function useChatDockSounds() {
  const enabled = useActionSoundsEnabled()
  const sfx = useSfx()
  const catalogSounds = useSoundPolicy()
  const popupsPaused = useState('chat-dock-popups-paused', () => false)
  const sessions = useState<Array<{ key: string; mode: string }>>('chat-dock-sessions', () => [])

  function play(kind: ChatDockSound, options: { valid?: () => boolean } = {}): boolean {
    if (!import.meta.client) return false
    const requestedAt = Date.now()
    const allowed = () => enabled.value !== false
      && document.visibilityState === 'visible'
      && !mediaFocus.isCallActive
      && mediaFocus.currentId === null
      && !popupsPaused.value
      && (options.valid?.() ?? true)
    if (!allowed()) return false
    const sessionsAtRequest = sessions.value
    const last = lastPlayedAt.get(kind) ?? 0
    if (requestedAt - last < CHAT_DOCK_SOUND_COOLDOWN_MS || requestedAt - lastAnyPlayedAt < CHAT_DOCK_MIN_GAP_MS) return false
    lastPlayedAt.set(kind, requestedAt)
    lastAnyPlayedAt = requestedAt

    const fresh = () => allowed() && sessions.value === sessionsAtRequest && Date.now() - requestedAt < MAX_PENDING_AGE_MS
    const sound = SOUND_CATALOG[`chat-${kind}`]
    void sfx.playUrl(sound.url, { volume: sound.volume, shouldPlay: fresh }).catch(() => undefined)
    return true
  }

  return {
    popupsPaused,
    play,
    open: (options?: { valid?: () => boolean }) => play('open', options),
    minimize: (options?: { valid?: () => boolean }) => play('minimize', options),
    close: (options?: { valid?: () => boolean }) => play('close', options),
    sent: (options: { valid?: () => boolean } = {}) => {
      const sessionsAtRequest = sessions.value
      return catalogSounds.play('message-sent', {
        valid: () => sessions.value === sessionsAtRequest && (options.valid?.() ?? true),
      })
    },
  }
}
