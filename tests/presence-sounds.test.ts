import { useCookie, type CookieRef } from '#app'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePresenceChimes } from '~/composables/usePresenceChimes'
import { mediaFocus } from '~/utils/mediaFocus'

const mocks = vi.hoisted(() => ({ enabled: { value: true }, playUrl: vi.fn() }))
mockNuxtImport('useCookie', () => vi.fn())
vi.mock('~/composables/useSfx', () => ({ useSfx: () => ({ playUrl: mocks.playUrl }) }))

beforeEach(() => {
  vi.mocked(useCookie).mockReturnValue(mocks.enabled as CookieRef<boolean>)
  mocks.enabled.value = true
  mocks.playUrl.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  vi.useFakeTimers()
  vi.setSystemTime(1_000_000)
})
afterEach(() => { mediaFocus.reset(); vi.useRealTimers() })

describe('shared presence assets', () => {
  it('plays the same bundled motif as native and discards delayed or occupied cues', () => {
    const chimes = usePresenceChimes()
    expect(chimes.play('follow')).toBe(true)
    expect(mocks.playUrl).toHaveBeenCalledWith('/sounds/presence-follow.wav', expect.objectContaining({ volume: 0.24 }))
    const shouldPlay = mocks.playUrl.mock.calls[0]![1].shouldPlay
    expect(shouldPlay()).toBe(true)
    mediaFocus.claim('video', () => {})
    expect(shouldPlay()).toBe(false)
    mediaFocus.release('video')
    vi.advanceTimersByTime(601)
    expect(shouldPlay()).toBe(false)
    vi.advanceTimersByTime(1500)
    mocks.enabled.value = false
    expect(chimes.play('join')).toBe(false)
  })
})
