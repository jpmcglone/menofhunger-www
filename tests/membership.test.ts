import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { membershipAction, membershipTier, membershipSignIn } from '~/utils/membership'
import { useMembershipCheckout } from '~/composables/useMembershipCheckout'
import { contractFixtures } from './fixtures/api-contracts.gen'

const state = vi.hoisted(() => ({ fetch: vi.fn(), confirm: vi.fn(), navigate: vi.fn(), user: { value: { id: 'member' } } }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: state.fetch }))
mockNuxtImport('useAuth', () => () => ({ user: state.user }))
mockNuxtImport('useAppConfirm', () => () => ({ confirm: state.confirm }))
mockNuxtImport('navigateTo', () => state.navigate)
function render() {
  let checkout!: ReturnType<typeof useMembershipCheckout>
  const view = mount(defineComponent({ setup() { checkout = useMembershipCheckout(); return () => null } }))
  return { checkout, view }
}
beforeEach(() => { vi.resetAllMocks(); state.user.value = { id: 'member' } })
describe('membership presentation', () => {
  it('claims the native membership universal link', () => {
    const association = JSON.parse(readFileSync(resolve(process.cwd(), 'public/.well-known/apple-app-site-association'), 'utf8'))
    expect(association.applinks.details[0].components.some((rule: Record<string, string>) => rule['/'] === '/tiers')).toBe(true)
  })
  it('selects only the highest tier and honors fresh billing', () => {
    expect(membershipTier({ premium: true, premiumPlus: true })).toBe('premiumPlus')
    expect(membershipTier({ premium: true }, contractFixtures.billing.verified)).toBe('verified')
    expect(membershipTier(null, contractFixtures.billing.apple)).toBeNull()
  })
  it('labels lower tiers included and routes Apple subscribers to their provider', () => {
    expect(membershipAction('verified', 'premium', null).included).toBe(true)
    expect(membershipAction('premiumPlus', 'premium', contractFixtures.billing.apple).label).toBe('Manage with Apple')
    expect(membershipAction('premium', 'unverified', null).to).toBe('/settings/verification')
    expect(membershipSignIn('premiumPlus')).toBe('/login?redirect=%2Ftiers%3Fplan%3DpremiumPlus')
  })
})
describe('explicit membership checkout', () => {
  it.each(['apple', 'unverified'] as const)('blocks unsafe checkout for %s', async (fixture) => {
    state.fetch.mockResolvedValue(contractFixtures.billing[fixture])
    const { checkout, view } = render()
    await checkout.startCheckout('premiumPlus')
    expect(state.fetch).toHaveBeenCalledTimes(1)
    expect(checkout.checkoutError.value).toBeTruthy()
    expect(state.navigate).not.toHaveBeenCalled()
    view.unmount()
  })
  it('requires confirmation before an immediate Stripe upgrade', async () => {
    state.fetch.mockResolvedValue({ ...contractFixtures.billing.verified, premium: true, source: 'stripe' })
    state.confirm.mockResolvedValue(false)
    const { checkout, view } = render()
    await checkout.startCheckout('premiumPlus')
    expect(state.confirm).toHaveBeenCalledTimes(1)
    expect(state.fetch).toHaveBeenCalledTimes(1)
    expect(state.navigate).not.toHaveBeenCalled()
    view.unmount()
  })
  it('rechecks confirmed upgrades and rejects changed membership', async () => {
    let reads = 0
    state.fetch.mockImplementation(async () => ++reads === 1 ? { ...contractFixtures.billing.verified, premium: true, source: 'stripe' } : contractFixtures.billing.apple)
    state.confirm.mockResolvedValue(true)
    const { checkout, view } = render()
    await checkout.startCheckout('premiumPlus')
    expect(reads).toBe(2)
    expect(checkout.checkoutError.value).toBeTruthy()
    expect(state.navigate).not.toHaveBeenCalled()
    view.unmount()
  })
  it('ignores a delayed response after account switching and coalesces double clicks', async () => {
    let resolve!: (value: unknown) => void
    state.fetch.mockImplementation(() => new Promise(r => { resolve = r }))
    const { checkout, view } = render()
    const first = checkout.startCheckout('premium')
    await checkout.startCheckout('premium')
    expect(state.fetch).toHaveBeenCalledTimes(1)
    state.user.value = { id: 'other' }
    resolve(contractFixtures.billing.verified)
    await first
    expect(state.fetch).toHaveBeenCalledTimes(1)
    expect(state.navigate).not.toHaveBeenCalled()
    view.unmount()
  })
})
