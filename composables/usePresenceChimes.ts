import { useActionSoundsEnabled } from './useActionSounds'
import { useSfx } from './useSfx'
import { SOUND_CATALOG, claimSoundSlot } from '~/utils/sound-policy'
import { mediaFocus } from '~/utils/mediaFocus'

export type PresenceChime = 'join' | 'online' | 'offline' | 'follow'

/** Never more than one chime this often, across every caller in the tab. */
export const PRESENCE_CHIME_MIN_GAP_MS = 1500
let lastChimeAt = 0

/**
 * Presence chimes (map moments, follow-online pings). Honors the device's action-sounds
 * setting, stays quiet in hidden tabs and during calls, and rate-limits itself.
 */
export function usePresenceChimes() {
  const enabled = useActionSoundsEnabled()
  const sfx = useSfx()

  function play(kind: PresenceChime, opts: { extraEnabled?: () => boolean } = {}): boolean {
    if (!import.meta.client) return false
    const allowed = () =>
      enabled.value !== false &&
      document.visibilityState === 'visible' &&
      !mediaFocus.isCallActive && mediaFocus.currentId === null &&
      (opts.extraEnabled?.() ?? true)
    if (!allowed()) return false
    const now = Date.now()
    if (now - lastChimeAt < PRESENCE_CHIME_MIN_GAP_MS || !claimSoundSlot(`presence-${kind}`, now)) return false
    lastChimeAt = now
    const sound = SOUND_CATALOG[`presence-${kind}`]
    const fresh = () => allowed() && Date.now() - now < 600
    void sfx.playUrl(sound.url, { volume: sound.volume, shouldPlay: fresh }).catch(() => undefined)
    return true
  }

  return { play }
}
