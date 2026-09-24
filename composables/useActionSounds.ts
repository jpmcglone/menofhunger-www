import { useSfx } from './useSfx'
import { mediaFocus } from '~/utils/mediaFocus'

export type ActionSound = 'publish' | 'checkin' | 'feed-reveal' | 'record-start' | 'record-stop' | 'upload-ready' | 'save'

/** Device preference, including SSR so the settings switch never flashes the wrong state. */
export function useActionSoundsEnabled() {
  return useCookie<boolean>('moh-action-sounds', { default: () => true, maxAge: 31536000, sameSite: 'lax' })
}

export function useActionSounds() {
  const enabled = useActionSoundsEnabled()
  const sfx = useSfx()

  async function play(sound: ActionSound, options: { recordingOwner?: string; valid?: () => boolean } = {}) {
    if (!import.meta.client) return
    const requestedAt = Date.now()
    const allowed = () => enabled.value && document.visibilityState === 'visible'
      && !mediaFocus.isCallActive && mediaFocus.currentId === (options.recordingOwner ?? null)
      && (options.valid?.() ?? true)
    if (!allowed()) return
    // Drop slow/unlocked-later cues. Feedback must not play long after its action.
    const fresh = () => allowed() && Date.now() - requestedAt < 600
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        sfx.playUrl(`/sounds/action-${sound}.wav`, {
          volume: 0.7,
          shouldPlay: fresh,
          waitUntilEnded: true,
          subscribeToStop: (stop) => {
            const changed = () => { if (!allowed()) stop() }
            const unsubscribe = mediaFocus.subscribe(changed)
            document.addEventListener('visibilitychange', changed)
            return () => { unsubscribe(); document.removeEventListener('visibilitychange', changed) }
          },
        }),
        new Promise<void>(resolve => { timeout = setTimeout(resolve, 800) }),
      ])
    } catch {
      // Audio availability never changes whether an action succeeds.
    } finally {
      if (timeout) clearTimeout(timeout)
    }
  }

  return { enabled, play }
}
