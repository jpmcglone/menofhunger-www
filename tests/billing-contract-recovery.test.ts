import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSettingsBilling } from '~/composables/settings/useSettingsBilling'
import { contractFixtures } from './fixtures/api-contracts.gen'

const spies = vi.hoisted(() => ({ fetch: vi.fn(), me: vi.fn(), navigate: vi.fn(), query: {} as Record<string, string>, user: { value: { id: 'member' } }, confirm: vi.fn() }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: spies.fetch }))
mockNuxtImport('useAuth', () => () => ({ me: spies.me, user: spies.user }))
mockNuxtImport('useRoute', () => () => ({ path: '/settings/billing', query: spies.query }))
mockNuxtImport('navigateTo', () => spies.navigate)
mockNuxtImport('useAppConfirm', () => () => ({ confirm: spies.confirm }))
mockNuxtImport('useAppToast', () => () => ({ push: vi.fn() }))
function render() {
  let billing!: ReturnType<typeof useSettingsBilling>
  const view = mount(defineComponent({ setup() { billing = useSettingsBilling(); return () => null } }))
  return { billing, view }
}
beforeEach(() => { vi.resetAllMocks(); spies.query = {}; spies.me.mockResolvedValue(undefined) })
describe('shared billing contracts and checkout recovery', () => {
  it.each(Object.entries(contractFixtures.billing))('consumes the API %s fixture', async (_name, fixture) => {
    spies.fetch.mockImplementation(async (path: string) => path === '/billing/me' ? fixture : [])
    const { billing, view } = render()
    await billing.refreshBilling()
    expect(billing.billingMe.value).toEqual(fixture)
    expect(billing.billingError.value).toBeNull()
    expect(billing.billingHasAnyFreeMonths.value).toBe(fixture.source === 'grant')
    view.unmount()
  })
  it.each(['rejected', 'pending'])('recovers checkout when immediate sync is %s', async (outcome) => {
    spies.query = { checkout: 'success', session_id: 'synthetic-session' }
    spies.fetch.mockImplementation(async (path: string) => {
      if (path === '/billing/checkout-session/sync') {
        if (outcome === 'rejected') throw new Error('temporary outage')
        return contractFixtures.billing.verified
      }
      return path === '/billing/me' ? contractFixtures.billing.apple : []
    })
    const { billing, view } = render()
    await flushPromises()
    expect(spies.fetch).toHaveBeenCalledWith('/billing/me', { method: 'GET' })
    expect(billing.checkoutSuccessModal.value).toBe(true)
    expect(spies.me).toHaveBeenCalledTimes(1)
    view.unmount()
  })
  it('failed checkout never navigates and permits retry', async () => {
    spies.fetch.mockRejectedValueOnce(new Error('temporary outage'))
    const { billing, view } = render()
    await billing.startCheckout('premium')
    expect(billing.billingError.value).toBeTruthy()
    expect(billing.checkoutLoading.value).toBeNull()
    expect(spies.navigate).not.toHaveBeenCalled()
    spies.fetch.mockResolvedValueOnce(contractFixtures.billing.verified).mockResolvedValueOnce({ url: 'https://checkout.stripe.com/synthetic' })
    await billing.startCheckout('premium')
    expect(spies.navigate).toHaveBeenCalledWith('https://checkout.stripe.com/synthetic', { external: true })
    view.unmount()
  })
})
