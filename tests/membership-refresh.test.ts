import { defineComponent, ref, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, expect, it, vi } from 'vitest'
import type { BillingMe } from '~/types/api'
import { useMembership } from '~/composables/useMembership'
import { contractFixtures } from './fixtures/api-contracts.gen'

const state = vi.hoisted(() => ({ fetch: vi.fn(), add: vi.fn(), remove: vi.fn(), user: null as unknown }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: state.fetch }))
mockNuxtImport('useAuth', () => () => ({ user: state.user }))
mockNuxtImport('usePresence', () => () => ({ addUsersCallback: state.add, removeUsersCallback: state.remove }))
function render() {
  let membership!: ReturnType<typeof useMembership>
  const view = mount(defineComponent({ setup() { membership = useMembership(); return () => null } }))
  return { membership, view }
}
beforeEach(() => { vi.resetAllMocks(); state.user = ref({ id: 'one', premium: false, verifiedStatus: 'manual' }) })
it('loads on mount, refreshes after a membership event, and unsubscribes on disposal', async () => {
  let billing: BillingMe = contractFixtures.billing.verified
  state.fetch.mockImplementation(async () => billing)
  const { membership, view } = render()
  await flushPromises()
  expect(membership.currentTier.value).toBe('verified')
  billing = contractFixtures.billing.apple
  state.add.mock.calls[0]![0].onMeUpdated()
  await flushPromises()
  expect(membership.currentTier.value).toBe('premium')
  view.unmount()
  expect(state.remove).toHaveBeenCalledWith(state.add.mock.calls[0]![0])
})
it('discards a prior identity response even when it arrives last', async () => {
  const responses: Array<(billing: unknown) => void> = []
  state.fetch.mockImplementation(() => new Promise(resolve => responses.push(resolve)))
  const { membership, view } = render()
  membership.user.value = { id: 'two' } as typeof membership.user.value
  await nextTick()
  responses[1]!(contractFixtures.billing.verified)
  await flushPromises()
  responses[0]!(contractFixtures.billing.apple)
  await flushPromises()
  expect(membership.currentTier.value).toBe('verified')
  expect(membership.billing.value).toEqual(contractFixtures.billing.verified)
  view.unmount()
})
it('shows recoverable billing errors without losing the auth tier', async () => {
  let offline = true
  state.fetch.mockImplementation(async () => { if (offline) throw new Error('offline'); return contractFixtures.billing.verified })
  const { membership, view } = render()
  await flushPromises()
  expect(membership.error.value).toBeTruthy()
  expect(membership.currentTier.value).toBe('verified')
  offline = false
  await membership.refresh()
  expect(membership.error.value).toBeNull()
  expect(membership.billing.value).toBeTruthy()
  view.unmount()
})
