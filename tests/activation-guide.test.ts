import { computed, defineComponent, nextTick, ref, type Ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, expect, it, vi } from 'vitest'
import { useActivationGuide } from '~/composables/useActivationGuide'

const state = vi.hoisted(() => ({ fetch: vi.fn(), capture: vi.fn(), user: null as unknown, verified: null as unknown, addPosts: vi.fn(), removePosts: vi.fn() }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: state.fetch }))
mockNuxtImport('useAuth', () => () => ({ user: state.user, isVerified: state.verified }))
mockNuxtImport('usePostHog', () => () => ({ capture: state.capture }))
mockNuxtImport('usePresence', () => () => ({ connectionBarJustConnected: ref(false), addUsersCallback: vi.fn(), removeUsersCallback: vi.fn(), addFollowsCallback: vi.fn(), removeFollowsCallback: vi.fn(), addPostsCallback: state.addPosts, removePostsCallback: state.removePosts }))
const pending = { phase: 'before_approval', verificationRequested: true, verificationPending: true, followed: false, contributed: false, replied: false, returned: false }
const approved = { ...pending, phase: 'approved', verificationPending: false }
function render() {
  let guide!: ReturnType<typeof useActivationGuide>
  const view = mount(defineComponent({ setup() { guide = useActivationGuide(); return () => null } }))
  return { guide, view }
}
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear()
  const user = ref({ id: 'one', verifiedStatus: 'none', isOrganization: false })
  state.user = user
  state.verified = computed(() => user.value.verifiedStatus === 'manual')
  state.fetch.mockResolvedValue(pending)
})
it('resurfaces the approved guide after preapproval dismissal', async () => {
  const { guide, view } = render(); await flushPromises()
  guide.dismiss(); expect(guide.dismissed.value).toBe(true)
  state.fetch.mockResolvedValue(approved)
  ;(state.user as Ref<{ id: string; verifiedStatus: string }>).value.verifiedStatus = 'manual'
  await nextTick(); await flushPromises()
  expect(guide.dismissed.value).toBe(false)
  expect(guide.completedCount.value).toBe(0)
  expect(state.capture).toHaveBeenCalledWith('onboarding_guide_viewed', expect.objectContaining({ phase: 'approved' }))
  view.unmount()
})
it('discards an old account response and fetches the new account', async () => {
  let resolveOld!: (value: unknown) => void
  state.fetch.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve })).mockResolvedValue({ ...pending, verificationRequested: false })
  const { guide, view } = render()
  ;(state.user as Ref<{ id: string; verifiedStatus: string }>).value = { id: 'two', verifiedStatus: 'none' }
  await nextTick()
  resolveOld(pending); await flushPromises()
  expect(guide.progress.value?.verificationRequested).toBe(false)
  expect(state.fetch).toHaveBeenCalledTimes(2)
  view.unmount()
})
it('retains confirmed progress on failure and recovers on retry', async () => {
  const { guide, view } = render(); await flushPromises()
  state.fetch.mockRejectedValueOnce(new Error('offline'))
  await guide.sync()
  expect(guide.syncError.value).toBe(true)
  expect(guide.completedCount.value).toBe(1)
  await guide.sync(); expect(guide.syncError.value).toBe(false)
  view.unmount()
})
it('refetches own realtime participation and removes subscriptions', async () => {
  const { guide, view } = render(); await flushPromises()
  state.fetch.mockResolvedValue({ ...pending, followed: true })
  state.addPosts.mock.calls[0]![0].onCommentAdded({ comment: { author: { id: 'one' } } })
  await flushPromises(); expect(guide.completedCount.value).toBe(2)
  view.unmount(); expect(state.removePosts).toHaveBeenCalledWith(state.addPosts.mock.calls[0]![0])
})
