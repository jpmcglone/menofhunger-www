import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useVoiceRecorder } from '../../composables/chat/useVoiceRecorder'
import { mediaFocus } from '../../utils/mediaFocus'

const sounds = vi.hoisted(() => ({ play: vi.fn() }))
vi.mock('../../composables/useActionSounds', () => ({ useActionSounds: () => sounds }))

class FakeRecorder {
  static isTypeSupported() { return true }
  state = 'inactive'
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  start() { this.state = 'recording' }
  stop() { this.state = 'inactive'; queueMicrotask(() => { this.ondataavailable?.({ data: new Blob(['test-audio']) }); this.onstop?.() }) }
}
const originalMediaDevices = navigator.mediaDevices
const stopTrack = vi.fn()
const stream = { getTracks: () => [{ stop: stopTrack }] }
const getUserMedia = vi.fn()
beforeEach(() => {
  vi.useFakeTimers()
  sounds.play.mockReset().mockResolvedValue(undefined)
  getUserMedia.mockReset().mockResolvedValue(stream)
  stopTrack.mockReset()
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } })
  vi.stubGlobal('MediaRecorder', FakeRecorder)
  vi.stubGlobal('AudioContext', undefined)
})
afterEach(() => {
  mediaFocus.reset()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: originalMediaDevices })
})
describe('voice recorder lifecycle', () => {
  it('waits for the start tick before capturing and cancels safely during the cue', async () => {
    let finish = () => {}
    sounds.play.mockImplementation(() => new Promise<void>(resolve => { finish = resolve }))
    const voice = useVoiceRecorder()
    const pending = voice.start()
    await Promise.resolve()
    expect(sounds.play).toHaveBeenCalledWith('record-start', expect.anything())
    expect(voice.recording.value).toBe(false)
    voice.cancel()
    finish()
    await pending
    expect(voice.recording.value).toBe(false)
    expect(stopTrack).toHaveBeenCalledOnce()
    expect(sounds.play.mock.calls.map(call => call[0])).toEqual(['record-start'])
  })
  it('never plays a cue when microphone permission fails', async () => {
    getUserMedia.mockRejectedValue(new Error('Denied'))
    await expect(useVoiceRecorder().start()).rejects.toThrow('Denied')
    expect(sounds.play).not.toHaveBeenCalled()
    expect(mediaFocus.currentId).toBeNull()
  })
  it('cancels a pending permission grant without leaving the microphone live', async () => {
    let grant: (v: unknown) => void = () => {}
    getUserMedia.mockImplementationOnce(() => new Promise(resolve => { grant = resolve }))
    const voice = useVoiceRecorder()
    const start = voice.start()
    expect(voice.starting.value).toBe(true)
    voice.cancel()
    grant(stream)
    await start
    expect(voice.recording.value).toBe(false)
    expect(stopTrack).toHaveBeenCalledOnce()
    expect(mediaFocus.currentId).toBeNull()
  })
  it('retains a preview at the duration limit and stops all microphone tracks', async () => {
    const voice = useVoiceRecorder()
    await voice.start()
    await vi.advanceTimersByTimeAsync(120_000)
    expect(voice.recording.value).toBe(false)
    expect(voice.draft.value?.durationSeconds).toBe(120)
    expect(voice.draft.value?.file.size).toBeGreaterThan(0)
    expect(sounds.play.mock.calls.map(call => call[0])).toEqual(['record-start', 'record-stop'])
    expect(stopTrack).toHaveBeenCalledOnce()
    voice.cancel()
    expect(voice.draft.value).toBeNull()
  })
  it('coalesces repeated Stop calls instead of dropping either result', async () => {
    const voice = useVoiceRecorder()
    await voice.start()
    const first = voice.stop()
    const second = voice.stop()
    expect(first).toBe(second)
    expect((await first)?.file.size).toBeGreaterThan(0)
  })
})
