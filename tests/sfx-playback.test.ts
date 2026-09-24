import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSfx } from '../composables/useSfx'

class Source {
  buffer: unknown
  onended: (() => void) | null = null
  connect = vi.fn()
  disconnect = vi.fn()
  start = vi.fn()
  stop = vi.fn(() => this.onended?.())
}
const sources: Source[] = []
class Context {
  state = 'running'
  destination = {}
  decodeAudioData = async () => ({ duration: 0.1 })
  createBufferSource() { const source = new Source(); sources.push(source); return source }
  createGain() { return { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() } }
}
const fetchSound = vi.fn()
beforeEach(() => {
  sources.length = 0
  fetchSound.mockReset().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })
  vi.stubGlobal('fetch', fetchSound)
  vi.stubGlobal('AudioContext', Context)
})
afterEach(() => vi.unstubAllGlobals())

describe('Web Audio action cue playback', () => {
  it('does not fetch or play when the initial guard rejects it', async () => {
    await useSfx().playUrl('/sounds/muted-test.wav', { shouldPlay: () => false })
    expect(fetchSound).not.toHaveBeenCalled()
    expect(sources).toHaveLength(0)
  })
  it('rechecks the guard after fetching and decoding', async () => {
    let allowed = true
    fetchSound.mockImplementation(async () => {
      allowed = false
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) }
    })
    await useSfx().playUrl('/sounds/stale-test.wav', { shouldPlay: () => allowed })
    expect(fetchSound).toHaveBeenCalledOnce()
    expect(sources).toHaveLength(0)
  })
  it('awaits actual completion so recording cannot start over the cue', async () => {
    let completed = false
    let announceStart = () => {}
    const started = new Promise<void>(resolve => { announceStart = resolve })
    const playback = useSfx().playUrl('/sounds/record-test.wav', {
      waitUntilEnded: true,
      subscribeToStop: () => { announceStart(); return () => {} },
    }).then(() => { completed = true })
    await started
    expect(sources[0]!.start).toHaveBeenCalledOnce()
    expect(completed).toBe(false)
    sources[0]!.onended?.()
    await playback
    expect(completed).toBe(true)
    expect(sources[0]!.disconnect).toHaveBeenCalledOnce()
  })
  it('interrupts and cleans up a cue once when focus is lost', async () => {
    const unsubscribe = vi.fn()
    let stop = () => {}
    await useSfx().playUrl('/sounds/interrupted-test.wav', {
      subscribeToStop: cancel => { stop = cancel; return unsubscribe },
    })
    stop()
    stop()
    expect(sources[0]!.stop).toHaveBeenCalledOnce()
    expect(unsubscribe).toHaveBeenCalledOnce()
    expect(sources[0]!.disconnect).toHaveBeenCalledOnce()
  })
})
