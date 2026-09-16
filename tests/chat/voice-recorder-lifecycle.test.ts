import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useVoiceRecorder } from '../../composables/chat/useVoiceRecorder'
import { mediaFocus } from '../../utils/mediaFocus'

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
