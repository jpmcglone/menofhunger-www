import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useAuth } from '~/composables/useAuth'

const authSpies = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  disconnect: vi.fn(),
  emitLogout: vi.fn(),
  onLogout: vi.fn(),
  navigateTo: vi.fn(),
  clearAuthClientState: vi.fn(),
  bumpAuthGeneration: vi.fn(),
}))
mockNuxtImport('useApiClient', () => () => ({ apiFetch: authSpies.apiFetch }))
mockNuxtImport('usePushNotifications', () => () => ({ onLogout: authSpies.onLogout }))
mockNuxtImport('navigateTo', () => authSpies.navigateTo)
vi.mock('~/composables/usePresence', () => ({
  usePresence: () => ({
    disconnect: authSpies.disconnect,
    emitLogout: authSpies.emitLogout,
    addUsersCallback: vi.fn(),
    removeUsersCallback: vi.fn(),
  }),
}))
vi.mock('~/composables/useUsersStore', () => ({ useUsersStore: () => ({}) }))
vi.mock('~/composables/auth/authState', () => ({
  clearAuthClientState: authSpies.clearAuthClientState,
  bumpAuthGeneration: authSpies.bumpAuthGeneration,
  getAuthGeneration: () => 0,
  bumpIdentityVersion: vi.fn(),
}))

let wrapper: ReturnType<typeof mount> | undefined

beforeEach(() => {
  // clearAllMocks does not drain mockResolvedValueOnce / mockRejectedValueOnce.
  authSpies.apiFetch.mockReset()
  authSpies.disconnect.mockReset()
  authSpies.emitLogout.mockReset()
  authSpies.navigateTo.mockReset()
  authSpies.clearAuthClientState.mockReset()
  authSpies.bumpAuthGeneration.mockReset()
  authSpies.onLogout.mockReset()
  authSpies.onLogout.mockResolvedValue(undefined)
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

function setup() {
  let auth!: ReturnType<typeof useAuth>
  wrapper = mount(defineComponent({
    setup() {
      useState('auth-ws-users-self-updated-hooked', () => true).value = true
      auth = useAuth()
      auth.user.value = { id: 'viewer', phone: null }
      return () => h('div')
    },
  }))
  return { auth }
}

describe('log out everywhere', () => {
  it('keeps the current session usable and reports failed revocation', async () => {
    authSpies.apiFetch.mockRejectedValueOnce(new Error('network unavailable'))
    const { auth } = setup()
    await expect(auth.logoutEverywhere()).rejects.toThrow('network unavailable')
    expect(auth.user.value?.id).toBe('viewer')
    expect(authSpies.clearAuthClientState).not.toHaveBeenCalled()
    expect(authSpies.bumpAuthGeneration).not.toHaveBeenCalled()
    expect(authSpies.disconnect).not.toHaveBeenCalled()
    expect(authSpies.emitLogout).not.toHaveBeenCalled()
    expect(authSpies.navigateTo).not.toHaveBeenCalled()
  })

  it('clears local auth only after confirmed revocation', async () => {
    authSpies.apiFetch.mockResolvedValueOnce({ data: { success: true } })
    const { auth } = setup()
    await auth.logoutEverywhere()
    expect(authSpies.apiFetch).toHaveBeenCalledWith('/auth/sessions/revoke-all', { method: 'POST' })
    expect(auth.user.value).toBeNull()
    expect(authSpies.clearAuthClientState).toHaveBeenCalled()
    expect(authSpies.disconnect).toHaveBeenCalled()
    expect(authSpies.navigateTo).toHaveBeenCalledWith('/home', { replace: true })
  })
})
