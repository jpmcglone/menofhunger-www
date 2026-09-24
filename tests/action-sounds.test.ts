import { useCookie, type CookieRef } from '#app'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useActionSounds } from '../composables/useActionSounds'
import { mediaFocus } from '../utils/mediaFocus'

const mocks = vi.hoisted(() => ({ enabled: { value: true }, play: vi.fn() }))
mockNuxtImport('useCookie', () => vi.fn())
vi.mock('../composables/useSfx', () => ({ useSfx: () => ({ playUrl: mocks.play }) }))

beforeEach(() => {
  vi.mocked(useCookie).mockReturnValue(mocks.enabled as CookieRef<boolean>)
  mocks.enabled.value = true
  mocks.play.mockReset().mockResolvedValue(undefined)
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
})
afterEach(() => { mediaFocus.reset(); vi.useRealTimers() })

describe('action sound policy', () => {
  it('plays the matching asset at a restrained volume', async () => {
    await useActionSounds().play('checkin')
    expect(mocks.play).toHaveBeenCalledWith('/sounds/action-checkin.wav', expect.objectContaining({ volume: 0.7 }))
  })
  it('stays silent when disabled, hidden, in a call, or media owns audio', async () => {
    const sounds = useActionSounds()
    mocks.enabled.value = false
    await sounds.play('publish')
    mocks.enabled.value = true
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    await sounds.play('publish')
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    mediaFocus.setCallActive(true)
    await sounds.play('publish')
    mediaFocus.setCallActive(false)
    mediaFocus.claim('video', () => {})
    await sounds.play('publish')
    expect(mocks.play).not.toHaveBeenCalled()
  })
  it('rechecks mute, focus, cancellation and age after async decoding', async () => {
    vi.useFakeTimers()
    let valid = true
    await useActionSounds().play('upload-ready', { valid: () => valid })
    const { shouldPlay } = mocks.play.mock.calls[0]![1]
    expect(shouldPlay()).toBe(true)
    mocks.enabled.value = false
    expect(shouldPlay()).toBe(false)
    mocks.enabled.value = true
    valid = false
    expect(shouldPlay()).toBe(false)
    valid = true
    mediaFocus.claim('voice', () => {})
    expect(shouldPlay()).toBe(false)
    mediaFocus.release('voice')
    vi.advanceTimersByTime(601)
    expect(shouldPlay()).toBe(false)
  })
  it('allows only the owning recorder to play its pre-capture tick', async () => {
    mediaFocus.claim('recorder', () => {}, { exclusive: true })
    const sounds = useActionSounds()
    await sounds.play('record-start', { recordingOwner: 'other' })
    expect(mocks.play).not.toHaveBeenCalled()
    await sounds.play('record-start', { recordingOwner: 'recorder' })
    expect(mocks.play).toHaveBeenCalledTimes(1)
  })
  it('stops an already-playing cue when a call starts and removes listeners', async () => {
    await useActionSounds().play('save')
    const stop = vi.fn()
    const unsubscribe = mocks.play.mock.calls[0]![1].subscribeToStop(stop)
    mediaFocus.setCallActive(true)
    expect(stop).toHaveBeenCalledOnce()
    unsubscribe()
    mediaFocus.setCallActive(false)
    mediaFocus.setCallActive(true)
    expect(stop).toHaveBeenCalledOnce()
  })
  it('does not hold microphone startup hostage to an unavailable sound file', async () => {
    vi.useFakeTimers()
    mocks.play.mockImplementation(() => new Promise(() => {}))
    const finished = vi.fn()
    const playing = useActionSounds().play('record-start').then(finished)
    await vi.advanceTimersByTimeAsync(800)
    await playing
    expect(finished).toHaveBeenCalledOnce()
  })
})
