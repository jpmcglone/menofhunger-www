import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePrivateApiData } from '../composables/usePrivateApiData'
const spies = vi.hoisted(() => ({ fetch: vi.fn(), add: vi.fn(), remove: vi.fn(), addMarv: vi.fn(), removeMarv: vi.fn() }))
const user = ref({ id: 'admin', siteAdmin: true })
const connected = ref(true)
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: spies.fetch }))
mockNuxtImport('useAuth', () => () => ({ user }))
mockNuxtImport('usePresence', () => () => ({ addAdminCallback: spies.add, removeAdminCallback: spies.remove, addMarvCallback: spies.addMarv, removeMarvCallback: spies.removeMarv, isSocketConnected: connected }))
function harness() {
  let state!: ReturnType<typeof usePrivateApiData<{ count: number }>>
  const wrapper = mount(defineComponent({ setup() { state = usePrivateApiData<{ count: number }>('/admin/operations/attention'); return () => h('div') } }))
  return { state, wrapper }
}
beforeEach(() => { vi.clearAllMocks(); user.value = { id: 'admin', siteAdmin: true }; spies.fetch.mockResolvedValue({ count: 3 }) })
describe('private API panels', () => {
  it('loads and cleans up both typed subscriptions', async () => {
    const { state, wrapper } = harness()
    await flushPromises()
    expect(state.data.value).toEqual({ count: 3 })
    wrapper.unmount()
    expect(spies.remove).toHaveBeenCalledWith(spies.add.mock.calls[0]![0])
    expect(spies.removeMarv).toHaveBeenCalledWith(spies.addMarv.mock.calls[0]![0])
  })
  it('clears private data immediately on admin revocation and ignores pending responses', async () => {
    let resolve!: (value: { count: number }) => void
    spies.fetch.mockReturnValue(new Promise(done => { resolve = done }))
    const { state, wrapper } = harness()
    user.value = { id: 'admin', siteAdmin: false }
    await nextTick()
    resolve({ count: 99 })
    await flushPromises()
    expect(state.data.value).toBeNull()
    expect(spies.fetch).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
