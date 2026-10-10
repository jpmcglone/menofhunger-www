import { useCookie, type CookieRef } from '#app'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatDockSounds, CHAT_DOCK_MIN_GAP_MS, resetChatDockSoundPolicyForTests } from '~/composables/chat/useChatDockSounds'
import { mediaFocus } from '~/utils/mediaFocus'

const mocks = vi.hoisted(() => ({ enabled: { value: true }, playUrl: vi.fn() }))
mockNuxtImport('useCookie', () => vi.fn())
vi.mock('~/composables/useSfx', () => ({ useSfx: () => ({ playUrl: mocks.playUrl }) }))

beforeEach(() => {
  vi.mocked(useCookie).mockReturnValue(mocks.enabled as CookieRef<boolean>)
  mocks.enabled.value = true
  mocks.playUrl.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
  useState('chat-dock-popups-paused', () => false).value = false
  useState<Array<{ key: string; mode: string }>>('chat-dock-sessions', () => []).value = []
  resetChatDockSoundPolicyForTests()
  vi.useFakeTimers()
  vi.setSystemTime(10_000)
})

afterEach(() => { mediaFocus.reset(); vi.useRealTimers() })

describe('desktop chat dock sounds', () => {
  it('plays distinct, restrained motifs for opening, minimizing, and closing', () => {
    const sounds = useChatDockSounds()
    expect(sounds.open()).toBe(true)
    expect(sounds.minimize()).toBe(false)
    vi.advanceTimersByTime(CHAT_DOCK_MIN_GAP_MS)
    expect(sounds.minimize()).toBe(true)
    vi.advanceTimersByTime(CHAT_DOCK_MIN_GAP_MS)
    expect(sounds.close()).toBe(true)
    expect(mocks.playUrl).toHaveBeenCalledTimes(3)
    expect(mocks.playUrl.mock.calls.map(call => call[0])).toEqual([
      '/sounds/chat-open.wav',
      '/sounds/chat-minimize.wav',
      '/sounds/chat-close.wav',
    ])
    expect(mocks.playUrl.mock.calls.every(call => call[1].volume <= 0.16)).toBe(true)
  })

  it('respects the sounds setting, paused popups, hidden tabs, calls, and foreground media', () => {
    const sounds = useChatDockSounds()
    mocks.enabled.value = false
    expect(sounds.open()).toBe(false)
    mocks.enabled.value = true
    sounds.popupsPaused.value = true
    expect(sounds.open()).toBe(false)
    sounds.popupsPaused.value = false
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    expect(sounds.open()).toBe(false)
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    mediaFocus.setCallActive(true)
    expect(sounds.open()).toBe(false)
    mediaFocus.setCallActive(false)
    mediaFocus.claim('video', () => {})
    expect(sounds.open()).toBe(false)
    expect(mocks.playUrl).not.toHaveBeenCalled()
  })

  it('rate-limits duplicate actions and drops cues after a session becomes stale or unlock is delayed', () => {
    const sounds = useChatDockSounds()
    expect(sounds.open()).toBe(true)
    expect(sounds.open()).toBe(false)
    expect(sounds.close()).toBe(false)
    vi.advanceTimersByTime(CHAT_DOCK_MIN_GAP_MS)
    expect(sounds.open()).toBe(true)
    vi.advanceTimersByTime(CHAT_DOCK_MIN_GAP_MS)
    const stale = vi.fn(() => false)
    expect(sounds.close({ valid: stale })).toBe(false)
    const shouldPlay = mocks.playUrl.mock.calls.at(-1)![1].shouldPlay
    expect(shouldPlay()).toBe(true)
    stale.mockReturnValue(true)
    // State can change while Web Audio is waiting for user activation or decode.
    const pending = sounds.minimize({ valid: stale })
    expect(pending).toBe(true)
    const pendingShouldPlay = mocks.playUrl.mock.calls.at(-1)![1].shouldPlay
    stale.mockReturnValue(false)
    expect(pendingShouldPlay()).toBe(false)
    stale.mockReturnValue(true)
    const sessions = useState<Array<{ key: string; mode: string }>>('chat-dock-sessions', () => [])
    const originalSessions = sessions.value
    sessions.value = [{ key: 'changed', mode: 'expanded' }]
    expect(pendingShouldPlay()).toBe(false)
    sessions.value = originalSessions
    expect(pendingShouldPlay()).toBe(true)
    vi.advanceTimersByTime(601)
    expect(pendingShouldPlay()).toBe(false)
  })

  it('reuses the acknowledged-message cue for a sent chat message', () => {
    const sounds = useChatDockSounds()
    expect(sounds.sent()).toBe(true)
    expect(mocks.playUrl).toHaveBeenCalledWith('/sounds/action-message-sent.wav', expect.any(Object))
  })
})
