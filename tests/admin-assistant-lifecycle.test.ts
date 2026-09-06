import { defineComponent, h, nextTick, ref } from 'vue'
import PrimeVue from 'primevue/config'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminAssistantWorkspace from '../components/admin/AdminAssistantWorkspace.vue'
import { useAdminAssistant } from '../composables/useAdminAssistant'

const spies = vi.hoisted(() => ({ fetch: vi.fn(), add: vi.fn(), remove: vi.fn() }))
const user = ref<{ id: string; impersonation?: object | null }>({ id: 'admin' })
const connected = ref(true)
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: spies.fetch }))
mockNuxtImport('useAuth', () => () => ({ user }))
mockNuxtImport('usePresence', () => () => ({ addAdminCallback: spies.add, removeAdminCallback: spies.remove, isSocketConnected: connected }))
const workspace = { environment: 'http://localhost:3001/v1', configured: true, capabilities: [], actions: [], turns: [] }
function harness() {
  let state!: ReturnType<typeof useAdminAssistant>
  const wrapper = mount(defineComponent({ setup() { state = useAdminAssistant(); return () => h('div') } }))
  return { state, wrapper }
}
beforeEach(() => { vi.clearAllMocks(); user.value = { id: 'admin' }; spies.fetch.mockReset().mockResolvedValue(workspace) })

describe('admin workspace lifecycle', () => {
  it('loads without invoking AI, subscribes, and unregisters on teardown', async () => {
    const { wrapper, state } = harness()
    await flushPromises()
    expect(spies.fetch).toHaveBeenCalledWith('/admin/assistant')
    expect(spies.fetch).toHaveBeenCalledTimes(1)
    expect(state.workspace.value).toEqual(workspace)
    wrapper.unmount()
    expect(spies.remove).toHaveBeenCalledWith(spies.add.mock.calls[0]![0])
  })
  it('discards late private results after identity change', async () => {
    let resolve!: (value: typeof workspace) => void
    spies.fetch.mockReturnValue(new Promise(done => { resolve = done }))
    const { wrapper, state } = harness()
    user.value = { id: 'someone-else' }
    await nextTick()
    resolve(workspace)
    await flushPromises()
    expect(state.workspace.value).toBeNull()
    wrapper.unmount()
  })
  it('chat yes does not invoke the action endpoint', async () => {
    const { wrapper, state } = harness()
    await flushPromises()
    await state.send('yes')
    expect(spies.fetch.mock.calls.some(([path]) => String(path).includes('/actions/'))).toBe(false)
    const call = spies.fetch.mock.calls.find(([path]) => path === '/admin/assistant/messages')!
    expect(call[1]).toMatchObject({ method: 'POST', retry: 0, body: { message: 'yes', id: expect.any(String) } })
    wrapper.unmount()
  })
  it('clears sensitive workspace state when impersonation starts', async () => {
    const { wrapper, state } = harness()
    await flushPromises()
    user.value = { id: 'admin', impersonation: {} }
    await nextTick()
    expect(state.workspace.value).toBeNull()
    wrapper.unmount()
  })
})


describe('admin proposal review interface', () => {
  it('renders member text safely and executes only the explicitly clicked proposal', async () => {
    spies.fetch.mockResolvedValue({ ...workspace, turns: [{
      id: 'turn', question: 'Triage this feedback', answer: '<script>not trusted</script>',
      status: 'complete', sources: [], createdAt: '2026-09-06T00:00:00Z', actions: [{
        id: 'proposal', operation: 'feedback_update', title: 'A bug — Triage feedback',
        path: '/admin/feedback', before: '{"subject":"A bug","status":"new"}',
        changes: '{"status":"triaged"}', status: 'pending', resultMessage: null,
        expiresAt: '2099-01-01T00:00:00Z',
      }],
    }] })
    const wrapper = mount(AdminAssistantWorkspace, { global: { plugins: [PrimeVue], stubs: { Icon: true, NuxtLink: RouterLinkStub } } })
    try {
      await flushPromises()
      expect(wrapper.text()).toContain('<script>not trusted</script>')
      expect(wrapper.find('script').exists()).toBe(false)
      expect(spies.fetch.mock.calls.some(([path]) => String(path).includes('/actions/'))).toBe(false)
      const apply = wrapper.findAll('button').find(button => button.text().includes('Apply this change'))
      expect(apply).toBeDefined()
      await apply!.trigger('click')
      await flushPromises()
      expect(spies.fetch).toHaveBeenCalledWith('/admin/assistant/actions/proposal', {
        method: 'POST', body: { decision: 'confirm' }, retry: 0,
      })
    } finally { wrapper.unmount() }
  })
})
