import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MediaFocus } from '../utils/mediaFocus'
import { VideoAutoplayCoordinator, type PlayRequest } from '../utils/media/video-autoplay'

describe('unified viewport playback', () => {
  let focus: MediaFocus
  let coordinator: VideoAutoplayCoordinator
  beforeEach(() => { vi.useFakeTimers(); focus = new MediaFocus(); coordinator = new VideoAutoplayCoordinator(focus) })
  afterEach(() => { coordinator.dispose(); vi.useRealTimers() })
  function video(id: string, distance: number | null = 0, playbackKey?: string) {
    const box = { distance }
    const play = vi.fn((_request: PlayRequest) => {})
    const pause = vi.fn()
    const setAudio = vi.fn()
    const dispose = coordinator.register(id, { playbackKey, adapter: { play, pause, setAudio }, measure: () => box.distance === null ? null : { distance: box.distance } })
    return { box, play, pause, setAudio, dispose }
  }
  async function settle() { coordinator.schedule(); await vi.advanceTimersByTimeAsync(301) }
  it.each(['youtube', 'rumble', 'upload', 'direct-post'])('autoplays %s initially without scroll', async id => {
    const item = video(id); await settle()
    expect(item.play).toHaveBeenCalledOnce()
    expect(item.play.mock.calls[0]![0]).toMatchObject({ automatic: true, muted: true, volume: 1 })
  })
  it('keeps interactive previews tap-to-play while still pausing them offscreen', async () => {
    const box = { visible: true }; const play = vi.fn(); const pause = vi.fn()
    coordinator.register('preview', { autoplay: false, adapter: { play, pause }, measure: () => box.visible ? { distance: 0 } : null })
    await settle(); expect(play).not.toHaveBeenCalled()
    coordinator.play('preview'); expect(play).toHaveBeenCalledOnce()
    box.visible = false; await settle(); expect(pause).toHaveBeenCalledOnce()
    box.visible = true; await settle(); expect(play).toHaveBeenCalledOnce()
  })
  it('reselects on delayed layout and delayed registration', async () => {
    const first = video('first', null); await settle(); expect(first.play).not.toHaveBeenCalled()
    first.box.distance = 20; await settle(); expect(first.play).toHaveBeenCalledOnce()
    first.dispose(); const next = video('next'); await settle(); expect(next.play).toHaveBeenCalledOnce()
  })
  it('hands off upload to embed and back, aborting pending starts before the new play', async () => {
    const upload = video('upload'); const embed = video('embed', null)
    await settle(); const signal = upload.play.mock.calls[0]![0].signal
    upload.box.distance = null; embed.box.distance = 0; await settle()
    expect(signal.aborted).toBe(true); expect(upload.pause).toHaveBeenCalledOnce(); expect(embed.play).toHaveBeenCalledOnce()
    expect(coordinator.activeId).toBe('embed')
    embed.box.distance = null; upload.box.distance = 0; await settle()
    expect(embed.pause).toHaveBeenCalledOnce(); expect(upload.play).toHaveBeenCalledTimes(2)
  })
  it('holds paused audio and reselects on finish/dismiss/failure without scrolling', async () => {
    const item = video('video'); await settle()
    focus.claim('voice', vi.fn()); await settle()
    expect(item.pause).toHaveBeenCalledOnce(); expect(coordinator.activeId).toBeNull()
    await settle(); expect(item.play).toHaveBeenCalledOnce()
    focus.release('voice'); await vi.advanceTimersByTimeAsync(301)
    expect(item.play).toHaveBeenCalledTimes(2)
  })
  it('explicit video interrupts audio; late audio teardown cannot release it', async () => {
    video('video'); const pauseAudio = vi.fn(); focus.claim('voice', pauseAudio)
    coordinator.play('video'); expect(pauseAudio).toHaveBeenCalledOnce()
    focus.release('voice'); expect(coordinator.activeId).toBe('video')
    expect(focus.currentId).toBe('video:feed:video')
  })
  it('remembers user pause after exit/reentry until explicit play', async () => {
    const item = video('video'); coordinator.play('video'); coordinator.setAudio({ muted: false })
    coordinator.report('video', 'paused', true); await settle(); expect(item.play).toHaveBeenCalledOnce()
    item.box.distance = null; await settle(); item.box.distance = 0; await settle()
    expect(item.play).toHaveBeenCalledOnce()
    expect(coordinator.activeId).toBeNull()
    coordinator.play('video'); expect(item.play).toHaveBeenCalledTimes(2)
    item.box.distance = null; await settle(); item.box.distance = 0; await settle()
    expect(item.play).toHaveBeenCalledTimes(3)
  })
  it('retains a manual pause across remounts without suppressing a different video', async () => {
    const original = video('row:1', 0, 'file:one.mp4'); await settle()
    coordinator.report('row:1', 'paused', true); original.dispose()
    const replacement = video('row:2', 0, 'file:one.mp4'); await settle()
    expect(replacement.play).not.toHaveBeenCalled()
    replacement.box.distance = null
    const other = video('row:3', 0, 'file:two.mp4'); await settle()
    expect(other.play).toHaveBeenCalledOnce()
    other.box.distance = null; replacement.box.distance = 0; await settle()
    expect(replacement.play).not.toHaveBeenCalled()
    coordinator.reset(); await settle()
    expect(replacement.play).toHaveBeenCalledOnce()
  })
  it('remembers paused fullscreen video but clears that choice when its controls resume', async () => {
    const item = video('video'); await settle(); coordinator.pin('video', true)
    coordinator.report('video', 'paused', true)
    coordinator.report('video', 'playing')
    coordinator.pin('video', false); item.box.distance = null; await settle()
    item.box.distance = 0; await settle()
    expect(item.play).toHaveBeenCalledTimes(2)
  })
  it('selects center with hysteresis and waits for stability', async () => {
    const a = video('a', 100); const b = video('b', 150); await settle()
    b.box.distance = 0; await settle(); expect(coordinator.activeId).toBe('a')
    a.box.distance = 200; coordinator.schedule(); await vi.advanceTimersByTimeAsync(299); expect(b.play).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(2); expect(coordinator.activeId).toBe('b')
  })
  it('pins fullscreen/PiP offscreen but permits explicit takeover', async () => {
    const a = video('a'); const b = video('b', null); await settle(); coordinator.pin('a', true, true)
    a.box.distance = null; b.box.distance = 0; await settle(); expect(coordinator.activeId).toBe('a')
    coordinator.setHidden(true); expect(coordinator.activeId).toBe('a')
    coordinator.setHidden(false); coordinator.play('b'); expect(coordinator.activeId).toBe('b')
  })
  it('suspends ordinary videos and recovers foreground without scrolling', async () => {
    const item = video('video'); await settle(); coordinator.setHidden(true); await settle()
    expect(coordinator.activeId).toBeNull(); coordinator.setHidden(false); await settle(); expect(item.play).toHaveBeenCalledTimes(2)
  })
  it('keeps duplicate post instances independent and ignores old disposal', async () => {
    const old = video('post:instance1'); const duplicate = video('post:instance2', null); await settle()
    const replacement = video('post:instance1'); old.dispose(); await settle()
    expect(replacement.play).toHaveBeenCalledOnce(); expect(duplicate.play).not.toHaveBeenCalled()
  })
  it('propagates shared sound, does not retry blocked/failed candidates in a loop, resets on account change', async () => {
    const a = video('a'); const b = video('b', null); await settle()
    coordinator.setAudio({ muted: false, volume: 0.4 }); expect(b.setAudio).toHaveBeenLastCalledWith({ muted: false, volume: 0.4 })
    coordinator.report('a', 'blocked'); await settle(); expect(a.play).toHaveBeenCalledOnce()
    coordinator.reset(); await settle(); expect(a.play).toHaveBeenCalledTimes(2); expect(coordinator.audio).toEqual({ muted: true, volume: 1 })
  })
  it('ignores rejected promises from interrupted generations and stops rogue playing callbacks', async () => {
    let reject!: (error: Error) => void
    coordinator.register('slow', { measure: () => ({ distance: 0 }), adapter: { play: () => new Promise<void>((_, fail) => { reject = fail }), pause: vi.fn() } })
    await settle(); const next = video('next', 0); coordinator.play('next'); reject(new Error('old failure')); await settle()
    expect(coordinator.activeId).toBe('next')
    focus.claim('voice', vi.fn()); coordinator.report('next', 'playing'); expect(next.pause).toHaveBeenCalled()
  })
  it('protects recording while calls coexist', async () => {
    const item = video('video'); focus.claim('recording', vi.fn(), { exclusive: true }); coordinator.play('video'); expect(item.play).not.toHaveBeenCalled()
    focus.release('recording'); focus.setCallActive(true); await settle(); expect(item.play).toHaveBeenCalledOnce()
  })
})
