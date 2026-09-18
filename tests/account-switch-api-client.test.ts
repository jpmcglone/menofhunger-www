import { defineComponent } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useApiClient } from '~/composables/useApiClient'
import { useAccountSwitchState } from '~/composables/useAccountSwitchState'

const auth = vi.hoisted(() => ({ generation: 0, clear: vi.fn() }))
vi.mock('~/composables/auth/authState', () => ({
  getAuthGeneration: () => auth.generation,
  bumpAuthGeneration: () => ++auth.generation,
  clearAuthClientState: auth.clear,
}))
mockNuxtImport('useRuntimeConfig', () => () => ({ public: { apiBaseUrl: 'https://api.example.test' } }))
mockNuxtImport('useRoute', () => () => ({ path: '/home', meta: { layout: 'app' } }))

let client: ReturnType<typeof useApiClient>
let state: ReturnType<typeof useAccountSwitchState>
let view: Awaited<ReturnType<typeof mountSuspended>>
beforeEach(async () => {
  auth.generation = 0; auth.clear.mockReset()
  view = await mountSuspended(defineComponent({ setup() {
    client = useApiClient()
    state = useAccountSwitchState()
    state.transition.value = null
    return () => null
  } }))
})
afterEach(() => { view.unmount(); vi.unstubAllGlobals() })

describe('unauthorized responses during account switching', () => {
  it('does not clear auth for a request that started before the switch', async () => {
    let reject!: (error: unknown) => void
    vi.stubGlobal('$fetch', vi.fn(() => new Promise((_resolve, no) => { reject = no })))
    const request = client.apiFetch('/test', { mohDedupe: false })
    auth.generation++
    reject({ status: 401 })
    await expect(request).rejects.toEqual({ status: 401 })
    expect(auth.clear).not.toHaveBeenCalled()
  })

  it('does not sign out for background requests made during session rotation', async () => {
    state.transition.value = { userId: 'page', label: 'News', destination: null }
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue({ status: 401 }))
    await expect(client.apiFetch('/test', { mohDedupe: false })).rejects.toEqual({ status: 401 })
    expect(auth.clear).not.toHaveBeenCalled()
  })

  it('still clears a genuinely expired session outside a switch', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue({ status: 401 }))
    await expect(client.apiFetch('/test', { mohDedupe: false })).rejects.toEqual({ status: 401 })
    expect(auth.clear).toHaveBeenCalledTimes(1)
  })
})
