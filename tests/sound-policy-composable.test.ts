import { useCookie, type CookieRef } from '#app'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSoundPolicy } from '~/composables/useSoundPolicy'
import { mediaFocus } from '~/utils/mediaFocus'
import { resetSoundPolicyForTests } from '~/utils/sound-policy'

const mocks = vi.hoisted(() => ({ enabled: { value: true }, playUrl: vi.fn(), preloadUrls: vi.fn() }))
mockNuxtImport('useCookie', () => vi.fn())
vi.mock('~/composables/useSfx', () => ({ useSfx: () => ({ playUrl: mocks.playUrl, preloadUrls: mocks.preloadUrls }) }))

beforeEach(() => {
  vi.mocked(useCookie).mockReturnValue(mocks.enabled as CookieRef<boolean>)
  mocks.enabled.value = true
  mocks.playUrl.mockReset().mockResolvedValue(undefined)
  useState('chat-dock-popups-paused', () => false).value = false
  resetSoundPolicyForTests()
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  vi.useFakeTimers()
  vi.setSystemTime(20_000)
})

afterEach(() => { mediaFocus.reset(); vi.useRealTimers() })

describe('shared realtime sound policy', () => {
  it('silences incoming messages, sent confirmations, and reactions while dock popups are paused', () => {
    const sounds = useSoundPolicy()
    useState('chat-dock-popups-paused', () => false).value = true
    expect(sounds.play('message')).toBe(false)
    expect(sounds.play('message-sent')).toBe(false)
    expect(sounds.play('reaction')).toBe(false)
    // Activity and channel sounds keep their existing behavior.
    expect(sounds.play('notification')).toBe(true)
    expect(sounds.play('channel-message')).toBe(true)
    expect(mocks.playUrl).toHaveBeenCalledTimes(2)
  })

  it('rechecks the shared setting, media ownership, and 600ms freshness after decode', () => {
    const sounds = useSoundPolicy()
    expect(sounds.play('message')).toBe(true)
    const shouldPlay = mocks.playUrl.mock.calls[0]![1].shouldPlay
    expect(shouldPlay()).toBe(true)
    useState('chat-dock-popups-paused', () => false).value = true
    expect(shouldPlay()).toBe(false)
    useState('chat-dock-popups-paused', () => false).value = false
    mocks.enabled.value = false
    expect(shouldPlay()).toBe(false)
    mocks.enabled.value = true
    mediaFocus.claim('video', () => {})
    expect(shouldPlay()).toBe(false)
    mediaFocus.release('video')
    vi.advanceTimersByTime(601)
    expect(shouldPlay()).toBe(false)
  })

  it('drops a dock confirmation whose session is no longer current', () => {
    const valid = vi.fn(() => false)
    expect(useSoundPolicy().play('message-sent', { valid })).toBe(false)
    expect(mocks.playUrl).not.toHaveBeenCalled()
  })
})
