import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatAudioPlayer } from '../../composables/chat/useChatAudioPlayer'
import { mediaFocus } from '../../utils/mediaFocus'

class FakeAudio extends EventTarget {
  static latest: FakeAudio
  src = ''
  preload = ''
  paused = true
  ended = false
  currentTime = 0
  duration = 48
  playbackRate = 1
  constructor() { super(); FakeAudio.latest = this }
  play = vi.fn(async () => { this.paused = false; this.dispatchEvent(new Event('playing')) })
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')) }
  load() {}
  removeAttribute() { this.src = '' }
}
const player = useChatAudioPlayer()
beforeEach(() => { vi.stubGlobal('Audio', FakeAudio); player.stop(); mediaFocus.reset() })
afterEach(() => { player.stop(); mediaFocus.reset(); vi.unstubAllGlobals() })

describe('shared voice player', () => {
  it('shares state across route consumers and exposes pause, seek, speed and stop', async () => {
    player.toggle('one', '/one.m4a', { duration: 48 })
    await Promise.resolve()
    const elsewhere = useChatAudioPlayer()
    expect(elsewhere.playing.value).toBe(true)
    elsewhere.pause()
    expect(player.playing.value).toBe(false)
    expect(mediaFocus.currentId).toBe('voice')
    elsewhere.seek('one', 1000)
    expect(player.currentTime.value).toBe(48)
    elsewhere.cycleRate('one')
    expect(FakeAudio.latest.playbackRate).toBe(1.5)
    elsewhere.stop()
    expect(player.currentId.value).toBeNull()
    expect(FakeAudio.latest.src).toBe('')
  })
  it('video handoff stops the audio and dismisses its controls', () => {
    player.toggle('one', '/one.m4a')
    mediaFocus.claim('video:one', vi.fn())
    expect(FakeAudio.latest.paused).toBe(true)
    expect(player.currentId.value).toBeNull()
    expect(mediaFocus.currentId).toBe('video:one')
  })
  it('a rejected play is retryable and cannot overwrite a newer selection', async () => {
    player.toggle('one', '/one.m4a')
    player.pause()
    FakeAudio.latest.play.mockRejectedValueOnce(new Error('offline'))
    await player.play()
    expect(player.error.value).toContain('retry')
    await player.play()
    expect(player.error.value).toBeNull()
    expect(player.playing.value).toBe(true)
  })
})
