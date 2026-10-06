import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePushNotifications } from '../composables/usePushNotifications'

const fixture = vi.hoisted(() => ({ states: new Map(), user: null as any, apiFetch: vi.fn() }))
vi.mock('~/composables/useAuth', () => ({ useAuth: () => ({ user: fixture.user }) }))
mockNuxtImport('useRuntimeConfig', () => () => ({ public: { vapidPublicKey: 'AQID' } }))
vi.mock('~/composables/useApiClient', () => ({ useApiClient: () => ({ apiFetch: fixture.apiFetch }) }))
mockNuxtImport('useState', () => (key: string, initial: () => unknown) => {
  if (!fixture.states.has(key)) fixture.states.set(key, ref(initial()))
  return fixture.states.get(key)
})
const subscription = { endpoint: 'https://push.example/sub', getKey: () => new Uint8Array([1, 2]).buffer, unsubscribe: vi.fn() }
const registration = {
  active: {} as object | null,
  update: vi.fn(),
  pushManager: { subscribe: vi.fn(), getSubscription: vi.fn() },
}
let serviceWorker: { register: ReturnType<typeof vi.fn>; ready: Promise<typeof registration> }
beforeEach(() => {
  fixture.states.clear()
  fixture.user = ref({ id: 'u1' })
  fixture.apiFetch.mockReset().mockResolvedValue({})
  localStorage.clear()
  subscription.unsubscribe.mockReset().mockResolvedValue(true)
  registration.active = {}
  registration.update.mockReset().mockResolvedValue(undefined)
  registration.pushManager.subscribe.mockReset().mockResolvedValue(subscription)
  registration.pushManager.getSubscription.mockReset().mockResolvedValue(subscription)
  serviceWorker = { register: vi.fn().mockResolvedValue(registration), ready: Promise.resolve(registration) }
  vi.stubGlobal('navigator', { serviceWorker, userAgent: 'Chrome', platform: 'Linux', maxTouchPoints: 0 })
  vi.stubGlobal('Notification', { permission: 'granted', requestPermission: vi.fn() })
  vi.stubGlobal('PushManager', vi.fn())
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear() })

describe('browser push subscription', () => {
  it('waits for activation before subscribing on first install', async () => {
    registration.active = null
    let activate!: (value: typeof registration) => void
    serviceWorker.ready = new Promise(resolve => { activate = resolve })
    const push = usePushNotifications()
    const pending = push.subscribe()
    await Promise.resolve()
    await Promise.resolve()
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled()
    activate(registration)
    expect(await pending).toBe(true)
    expect(fixture.apiFetch).toHaveBeenCalledWith('/notifications/push-subscribe', expect.anything())
  })
  it('still subscribes when an update check fails for an active worker', async () => {
    registration.update.mockRejectedValue(new Error('offline update check'))
    const push = usePushNotifications()
    expect(await push.subscribe(), push.errorMessage.value ?? '').toBe(true)
  })
  it('preserves an explicit disable across state resets until manually enabled', async () => {
    await usePushNotifications().unsubscribe()
    fixture.states.clear()
    fixture.apiFetch.mockClear()
    const push = usePushNotifications()
    await push.ensureSubscribedWhenGranted()
    expect(fixture.apiFetch).not.toHaveBeenCalled()
    expect(await push.subscribe(), push.errorMessage.value ?? '').toBe(true)
    expect(localStorage.getItem('push-disabled:u1')).toBeNull()
  })
  it('logout does not opt the account out of future notification recovery', async () => {
    await usePushNotifications().onLogout()
    expect(localStorage.getItem('push-disabled:u1')).toBeNull()
  })
  it('shares registration state and prevents duplicate concurrent subscriptions', async () => {
    const first = usePushNotifications()
    const second = usePushNotifications()
    const pending = first.subscribe()
    expect(await second.subscribe()).toBe(false)
    await pending
    expect(registration.pushManager.subscribe).toHaveBeenCalledOnce()
    expect(second.isSubscribed.value).toBe(true)
  })
  it('keeps an opt-out scoped to its account', async () => {
    localStorage.setItem('push-disabled:u1', 'true')
    fixture.user.value = { id: 'u2' }
    await usePushNotifications().ensureSubscribedWhenGranted()
    expect(fixture.apiFetch).toHaveBeenCalledWith('/notifications/push-subscribe', expect.anything())
    expect(localStorage.getItem('push-disabled:u1')).toBe('true')
  })
  it('does not claim success when the API cannot save the subscription', async () => {
    fixture.apiFetch.mockRejectedValue(new Error('Network unavailable'))
    const push = usePushNotifications()
    expect(await push.subscribe()).toBe(false)
    expect(push.isSubscribed.value).toBe(false)
    expect(push.errorMessage.value).toBe('Network unavailable')
  })
  it('does not request permission automatically', async () => {
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn() })
    await usePushNotifications().ensureSubscribedWhenGranted()
    expect(Notification.requestPermission).not.toHaveBeenCalled()
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled()
  })
})
