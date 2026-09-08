// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

const { load } = vi.hoisted(() => ({ load: vi.fn(async () => new Blob(['mp4'])) }))
vi.mock('../utils/avatar-video-cache', () => ({ AvatarVideoCache: class { load = load; touch() {} } }))

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); document.body.replaceChildren() })

describe('shared avatar playback', () => {
  it('plays every visible source, shares duplicate players, and pauses only after the last copy leaves', async () => {
    vi.useFakeTimers()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:avatar')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {})
    const frameRequest = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'requestVideoFrameCallback')
    const frameCancel = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'cancelVideoFrameCallback')
    Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', { configurable: true, value: vi.fn(() => 1) })
    Object.defineProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback', { configurable: true, value: vi.fn() })
    const { subscribeAvatarVideo } = await import('../utils/avatar-video-playback')
    const canvas = () => {
      const host = document.createElement('span'), surface = document.createElement('canvas')
      host.append(surface); document.body.append(host)
      return surface
    }
    const stops: (() => void)[] = []
    try {
      for (let i = 0; i < 16; i++) stops.push(subscribeAvatarVideo({ id: `avatar-${i}`, url: `https://cdn.test/${i}.mp4`, durationMs: 7000, width: 320, height: 320 }, canvas()))
      const secondCopy = subscribeAvatarVideo({ id: 'avatar-0', url: 'https://cdn.test/0.mp4', durationMs: 7000, width: 320, height: 320 }, canvas())
      stops.push(secondCopy)
      await flushPromises()
      const players = [...document.querySelectorAll('video')]
      expect(players).toHaveLength(16)
      expect(load).toHaveBeenCalledTimes(16)
      expect(new Set(play.mock.contexts).size).toBe(16)
      expect(players.every(player => player.muted && player.loop && player.playsInline)).toBe(true)
      stops.shift()!()
      await flushPromises()
      expect(document.querySelectorAll('video')).toHaveLength(16)
      expect(load).toHaveBeenCalledTimes(16)
    } finally {
      stops.forEach(stop => stop())
      await vi.runAllTimersAsync()
      if (frameRequest) Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', frameRequest)
      else Reflect.deleteProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback')
      if (frameCancel) Object.defineProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback', frameCancel)
      else Reflect.deleteProperty(HTMLVideoElement.prototype, 'cancelVideoFrameCallback')
    }
    expect(document.querySelectorAll('video')).toHaveLength(0)
  })
})
