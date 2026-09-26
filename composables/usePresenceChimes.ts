import { useActionSoundsEnabled } from './useActionSounds'
import { useSfx } from './useSfx'
import { mediaFocus } from '~/utils/mediaFocus'

export type PresenceChime = 'join' | 'online' | 'offline' | 'follow'

const NOTE = { E4: 329.63, A4: 440, C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5 }

/** The motifs from the Figma spec: join rises three notes, online steps up, offline steps down. */
export const PRESENCE_CHIME_MOTIFS: Record<PresenceChime, { notes: Array<{ freq: number; at: number; duration: number }>; volume: number }> = {
  join: {
    notes: [
      { freq: NOTE.C5, at: 0, duration: 0.32 },
      { freq: NOTE.E5, at: 0.09, duration: 0.32 },
      { freq: NOTE.G5, at: 0.18, duration: 0.5 },
    ],
    volume: 0.32,
  },
  online: {
    notes: [
      { freq: NOTE.E5, at: 0, duration: 0.22 },
      { freq: NOTE.A5, at: 0.1, duration: 0.34 },
    ],
    volume: 0.26,
  },
  offline: {
    notes: [
      { freq: NOTE.A4, at: 0, duration: 0.24 },
      { freq: NOTE.E4, at: 0.12, duration: 0.4 },
    ],
    volume: 0.18,
  },
  follow: {
    notes: [
      { freq: NOTE.G5, at: 0, duration: 0.2 },
      { freq: NOTE.C6, at: 0.1, duration: 0.42 },
    ],
    volume: 0.24,
  },
}

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
      !mediaFocus.isCallActive &&
      (opts.extraEnabled?.() ?? true)
    if (!allowed()) return false
    const now = Date.now()
    if (now - lastChimeAt < PRESENCE_CHIME_MIN_GAP_MS) return false
    lastChimeAt = now
    const motif = PRESENCE_CHIME_MOTIFS[kind]
    void sfx.playTones(motif.notes, { volume: motif.volume, shouldPlay: allowed }).catch(() => undefined)
    return true
  }

  return { play }
}
