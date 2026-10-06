import { useActionSoundsEnabled } from './useActionSounds'
import { useSfx } from './useSfx'
import { mediaFocus } from '~/utils/mediaFocus'
import { SOUND_CATALOG, claimSoundSlot, type CatalogSound } from '~/utils/sound-policy'

/**
 * Single gate for realtime cues: the device "Sounds" setting, a visible tab, no call or
 * foreground media, the post-connect backlog window, and a per-cue cooldown.
 */
export function useSoundPolicy() {
  const enabled = useActionSoundsEnabled()
  const sfx = useSfx()

  function allowed() {
    return import.meta.client
      && enabled.value !== false
      && document.visibilityState === 'visible'
      && !mediaFocus.isCallActive
      && mediaFocus.currentId === null
  }

  function play(id: CatalogSound): boolean {
    if (!allowed() || !claimSoundSlot(id)) return false
    const sound = SOUND_CATALOG[id]
    void sfx.playUrl(sound.url, { volume: sound.volume, shouldPlay: allowed }).catch(() => undefined)
    return true
  }

  function preload(ids: CatalogSound[]) {
    void sfx.preloadUrls(ids.map(id => SOUND_CATALOG[id].url))
  }

  return { play, preload }
}
