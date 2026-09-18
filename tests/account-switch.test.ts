import { defineComponent } from 'vue'
import { useState } from '#app'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from '~/composables/useAuth'
import { useAccountSwitchState } from '~/composables/useAccountSwitchState'

const api = vi.hoisted(() => ({ fetch: vi.fn(), data: vi.fn(), clear: vi.fn() }))
const nav = vi.hoisted(() => ({ to: vi.fn() }))
vi.mock('~/composables/useApiClient', () => ({
  useApiClient: () => ({ apiFetch: api.fetch, apiFetchData: api.data }),
  clearMohCacheAll: api.clear,
}))
mockNuxtImport('navigateTo', () => nav.to)
vi.mock('~/composables/usePresence', () => ({
  usePresence: () => ({
    disconnect: vi.fn(),
    connect: vi.fn(),
    emitLogout: vi.fn(),
    addUsersCallback: vi.fn(),
    addAccountsCallback: vi.fn(),
    isSocketConnected: { value: false },
  }),
}))
vi.mock('~/composables/useBadgeHydration', () => ({
  useBadgeHydration: () => ({ refresh: vi.fn().mockResolvedValue(undefined) }),
}))
vi.mock('~/composables/usePushNotifications', () => ({
  usePushNotifications: () => ({ ensureSubscribedWhenGranted: vi.fn(), onLogout: vi.fn() }),
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

let auth: ReturnType<typeof useAuth>
let state: ReturnType<typeof useAccountSwitchState>
let view: Awaited<ReturnType<typeof mountSuspended>>
const person = { id: 'person', phone: null, accountKind: 'person' as const }
const page = { id: 'page', phone: null, accountKind: 'page' as const }

beforeEach(async () => {
  api.fetch.mockReset(); api.data.mockReset(); api.clear.mockReset(); nav.to.mockReset()
  api.fetch.mockResolvedValue({ data: page })
  api.data.mockResolvedValue({ user: page })
  nav.to.mockResolvedValue(undefined)
  view = await mountSuspended(defineComponent({ setup() {
    useState('auth-ws-users-self-updated-hooked').value = true
    auth = useAuth()
    state = useAccountSwitchState()
    return () => null
  } }))
  state.transition.value = null
  auth.user.value = person
  window.history.replaceState(null, '', '/home?tab=all#feed')
  vi.spyOn(window.location, 'reload').mockImplementation(() => {})
})
afterEach(() => { view.unmount(); vi.restoreAllMocks() })

describe('account switch handoff', () => {
  it('starts feedback synchronously, coalesces clicks, and unlocks after the identity swap', async () => {
    const request = deferred<{ user: typeof page }>()
    api.data.mockReturnValue(request.promise)
    const switching = auth.switchAccount('page', { label: 'News' })
    expect(state.transition.value).toEqual({ userId: 'page', label: 'News' })
    expect(auth.user.value?.id).toBe('person')
    await auth.switchAccount('another-page')
    expect(api.data).toHaveBeenCalledTimes(1)
    expect(api.data).toHaveBeenCalledWith('/auth/switch', expect.objectContaining({ retry: 0 }))
    request.resolve({ user: page })
    await switching
    expect(window.location.reload).not.toHaveBeenCalled()
    expect(state.transition.value).toBeNull()
    expect(auth.user.value?.id).toBe('page')
  })

  it('recovers when the cookie changed but the switch response failed', async () => {
    api.data.mockImplementation(async (path: string) => {
      if (path === '/auth/switch') throw new TypeError('Failed to fetch')
      return page
    })
    await auth.switchAccount('page')
    expect(api.data).toHaveBeenCalledWith('/auth/me', expect.objectContaining({
      mohDedupe: false, mohRetry: false, mohUnauthorized: 'ignore', timeout: 5_000,
    }))
    expect(window.location.reload).not.toHaveBeenCalled()
    expect(state.transition.value).toBeNull()
    expect(auth.user.value?.id).toBe('page')
  })

  it('unlocks for retry when the session did not rotate', async () => {
    const failure = new TypeError('Failed to fetch')
    api.data.mockImplementation(async (path: string) => {
      if (path === '/auth/switch') throw failure
      return person
    })
    await expect(auth.switchAccount('page')).rejects.toBe(failure)
    expect(state.transition.value).toBeNull()
    expect(auth.user.value?.id).toBe('person')
    expect(window.location.reload).not.toHaveBeenCalled()
    api.data.mockResolvedValue({ user: page })
    await auth.switchAccount('page')
    expect(auth.user.value?.id).toBe('page')
    expect(state.transition.value).toBeNull()
  })

  it('reloads when the switch result is ambiguous', async () => {
    api.data.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(auth.switchAccount('page')).resolves.toBeNull()
    expect(window.location.reload).toHaveBeenCalledTimes(1)
    expect(state.switchingId.value).toBe('page')
  })

  it('surfaces permission errors without retrying the mutation or probing the session', async () => {
    const denied = { status: 403 }
    api.data.mockRejectedValue(denied)
    await expect(auth.switchAccount('page')).rejects.toBe(denied)
    expect(state.transition.value).toBeNull()
    expect(api.data).toHaveBeenCalledTimes(1)
  })

  it('rejects an unconfirmed identity instead of presenting it as selected', async () => {
    api.data.mockResolvedValue({ user: person })
    await expect(auth.switchAccount('page')).rejects.toThrow('Could not confirm')
    expect(state.transition.value).toBeNull()
    expect(window.location.reload).not.toHaveBeenCalled()
  })

  it('ignores a me response that started under the previous session', async () => {
    const oldMe = deferred<{ data: typeof person }>()
    api.fetch.mockReset()
    api.fetch.mockReturnValueOnce(oldMe.promise)
    api.fetch.mockResolvedValue({ data: page })
    const checking = auth.me()
    await auth.switchAccount('page')
    oldMe.resolve({ data: { ...person, id: 'stale' } })
    await checking
    expect(auth.user.value?.id).toBe('page')
    expect(state.transition.value).toBeNull()
  })

  it('preserves safe destinations and redirects page accounts away from person-only routes', async () => {
    await auth.switchAccount('page', { then: '/check-ins' })
    expect(nav.to).toHaveBeenCalledWith('/home', { replace: true })
    expect(state.transition.value).toBeNull()
    expect(auth.user.value?.id).toBe('page')
    state.resumeNavigation()
    expect(window.location.reload).toHaveBeenCalledTimes(1)
    expect(api.data).toHaveBeenCalledTimes(1)
  })

  it('does not switch the already active account', async () => {
    await auth.switchAccount('person')
    expect(api.data).not.toHaveBeenCalled()
    expect(state.transition.value).toBeNull()
  })
})
