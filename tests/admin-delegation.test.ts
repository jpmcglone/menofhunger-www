import { defineComponent, h, nextTick, ref } from 'vue'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import PrimeVue from 'primevue/config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAdminDelegation } from '../composables/useAdminDelegation'
import DelegationAction from '../components/admin/delegation/DelegationAction.vue'
import DelegationEditor from '../components/admin/delegation/DelegationEditor.vue'
import { delegationSafePath, delegationSafeSource } from '../utils/admin-delegation'
const spies = vi.hoisted(() => ({ fetch: vi.fn(), add: vi.fn(), remove: vi.fn() }))
const user = ref<{ id: string; siteAdmin: boolean; accountSwitch?: object }>({ id: 'admin', siteAdmin: true })
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: spies.fetch, apiUrl: (path: string) => path }))
mockNuxtImport('useAuth', () => () => ({ user }))
mockNuxtImport('usePresence', () => () => ({ addAdminCallback: spies.add, removeAdminCallback: spies.remove, isSocketConnected: ref(true) }))
const workspace = { actionSchema: {}, operations: {}, configured: true, access: 'admin' as const, accounts: [{ id: 'admin', username: 'john', name: 'John', accountKind: 'person' },{ id: 'page', username: 'mohnews', name: 'News', accountKind: 'page' }], workflows: [{ id: 'news', title: 'News', description: '' }], jobs: [], integrations: [] }
const globals = { plugins: [PrimeVue], stubs: { NuxtLink: RouterLinkStub } }
function harness() { let state!: ReturnType<typeof useAdminDelegation>; const wrapper = mount(defineComponent({ setup() { state = useAdminDelegation(ref(undefined)); return () => h('div') } })); return { state, wrapper } }
beforeEach(() => { vi.clearAllMocks(); user.value = { id: 'admin', siteAdmin: true }; spies.fetch.mockResolvedValue(workspace) })
describe('delegated work privacy and lifecycle', () => {
  it('reads without executing and cleans up its subscriptions', async () => { const { state,wrapper } = harness(); await flushPromises(); expect(state.workspace.value).toEqual(workspace); expect(spies.fetch).toHaveBeenCalledTimes(1); wrapper.unmount(); expect(spies.remove).toHaveBeenCalledWith(spies.add.mock.calls[0]![0]) })
  it('discards late responses after operating a page', async () => { let resolve!: (v: unknown) => void; spies.fetch.mockReturnValue(new Promise(done => { resolve = done })); const { state,wrapper } = harness(); user.value = { id: 'admin', siteAdmin: true, accountSwitch: {} }; await nextTick(); resolve(workspace); await flushPromises(); expect(state.workspace.value).toBeNull(); wrapper.unmount() })
  it('makes no requests after the admin privilege is removed', async () => { user.value.siteAdmin = false; const { wrapper } = harness(); await flushPromises(); expect(spies.fetch).not.toHaveBeenCalled(); wrapper.unmount() })
  it('does not retry mutations automatically', async () => { const { state,wrapper } = harness(); await flushPromises(); await state.mutate('jobs/job/control',{ command: 'pause' }); expect(spies.fetch).toHaveBeenCalledWith('/admin/delegation/jobs/job/control',expect.objectContaining({ retry: 0, mohRetry: false })); wrapper.unmount() })
})
describe('explicit review and account defaults', () => {
  it('defaults a new job to the user and keeps its retry identity stable', async () => {
    const wrapper = mount(DelegationEditor,{ props: { workspace,busy:false }, global: globals });
    await wrapper.get('#job-title').setValue('News'); await wrapper.get('#job-instruction').setValue('Research news');
    await wrapper.get('form').trigger('submit'); await wrapper.get('form').trigger('submit');
    const first = wrapper.emitted('save')![0]![0] as Record<string,unknown>, second = wrapper.emitted('save')![1]![0] as Record<string,unknown>;
    expect(first.actorUsername).toBeUndefined(); expect(first.permission).toBe('review'); expect(first.id).toBe(second.id);
    await wrapper.get('#job-actor').setValue('mohnews'); await wrapper.get('form').trigger('submit');
    expect((wrapper.emitted('save')![2]![0] as Record<string,unknown>).actorUsername).toBe('mohnews'); wrapper.unmount()
  })
  it('preserves edited proposal text through refresh and requires an explicit click', async () => {
    const action = { id:'a',operation:'post_publish',title:'Publish',preview:'body: Original',body:'Original',status:'pending',receipt:null,path:null,sources:[],createdAt:'2026-09-07T00:00:00Z' };
    const wrapper = mount(DelegationAction,{props:{action,actor:'mohnews',busy:false,stale:false},global:globals});
    await wrapper.get('textarea').setValue('<script>Edited</script>'); await wrapper.setProps({action:{...action}});
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('<script>Edited</script>'); expect(wrapper.emitted('decide')).toBeUndefined();
    await wrapper.findAll('button').find(b=>b.text()==='Apply action')!.trigger('click');
    expect(wrapper.emitted('decide')![0]).toEqual(['a','confirm','<script>Edited</script>']); expect(wrapper.find('script').exists()).toBe(false); wrapper.unmount()
  })
  it('rejects external and executable result links',()=>{ expect(delegationSafePath('//evil.example')).toBe(false); expect(delegationSafePath('/p/one')).toBe(true); expect(delegationSafeSource('javascript:alert(1)')).toBe(false); expect(delegationSafeSource('https://example.com/news')).toBe(true) })
})
