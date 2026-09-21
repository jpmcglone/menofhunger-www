import { runInNewContext } from 'node:vm'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rumbleDocument } from '~/utils/media/rumble-document'

function player() {
  const calls: string[] = []
  const events: Record<string, (value?: unknown) => void> = {}
  let receiver: (event: unknown) => void = () => {}
  let ready: (api: unknown) => void = () => {}
  const parent = { postMessage: vi.fn() }
  vi.useFakeTimers()
  const api = {
    pause: () => calls.push('pause'), mute: () => calls.push('mute'), unmute: () => calls.push('unmute'),
    setVolume: (v: number) => calls.push(`volume:${v}`), setCurrentTime: (v: number) => calls.push(`seek:${v}`),
    autoplay: (sound: boolean) => calls.push(`play:${sound}`),
    getMuted: () => true, getVolume: () => 0, getCurrentTime: () => 12, getPaused: () => false,
    on: (name: string, callback: () => void) => { events[name] = callback },
  }
  const Rumble = (_command: string, options: { api: typeof ready }) => { ready = options.api }
  const html = rumbleDocument('https://rumble.com/embed/v17j3tt/', 'instance', 'https://app.test')
  const script = html.match(/<script>([\s\S]*?)<\/script>/)![1]!
  runInNewContext(script, { Date, setTimeout, clearTimeout, window: { Rumble }, Rumble, parent, addEventListener: (_: string, callback: typeof receiver) => { receiver = callback } })
  ready(api)
  const send = (data: unknown, origin = 'https://app.test', source = parent) => receiver({ data, origin, source })
  return { calls, events, parent, send, html }
}

afterEach(() => vi.useRealTimers())

describe('Rumble player bridge', () => {
  it('starts only on an authenticated command, without triggering the provider’s pause/play throttle', () => {
    const p = player()
    expect(p.calls).toEqual(['mute'])
    expect(p.html).toContain('/embedJS/u7a20.v17j3tt/')
    p.send({ channel: 'instance', action: 'play', muted: true, volume: 0.6, time: 12 })
    vi.advanceTimersByTime(501)
    expect(p.calls).toEqual(['mute', 'volume:0.6', 'mute', 'seek:12', 'play:false'])
    p.events.play!()
    expect(p.parent.postMessage).toHaveBeenLastCalledWith(expect.objectContaining({ state: 'play', time: 12, muted: true, volume: null }), 'https://app.test')
    p.send({ channel: 'instance', action: 'pause' })
    expect(p.calls.at(-1)).toBe('pause')
    p.send({ channel: 'instance', action: 'play', muted: true, volume: 1 })
    p.send({ channel: 'instance', action: 'pause' })
    vi.runAllTimers()
    expect(p.calls.filter(c => c.startsWith('play:'))).toHaveLength(1)
  })
  it('rejects foreign messages and preserves an explicit publisher', () => {
    const p = player()
    p.send({ channel: 'wrong', action: 'play' })
    p.send({ channel: 'instance', action: 'play' }, 'https://other.test')
    expect(p.calls).toEqual(['mute'])
    expect(rumbleDocument('https://rumble.com/embed/u123.v17j3tt/', 'id', 'https://app.test')).toContain('/embedJS/u123.v17j3tt/')
    expect(rumbleDocument('https://rumble.com/embed/v17j3tt/?pub=abc', 'id', 'https://app.test')).toContain('/embedJS/uabc.v17j3tt/')
    expect(() => rumbleDocument('https://evil.test/embed/v17j3tt/', 'id', 'https://app.test')).toThrow()
  })
})
