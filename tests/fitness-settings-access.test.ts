import { defineComponent, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SettingsFitness from '~/components/settings/sections/SettingsFitnessSection.vue'

const state = vi.hoisted(() => ({
  fetch: vi.fn(), toast: vi.fn(),
  verified: true, page: false,
  setEligibility: undefined as undefined | ((value: boolean) => void),
}))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: state.fetch }))
mockNuxtImport('useAppToast', () => () => ({ push: state.toast }))
mockNuxtImport('useAuth', () => () => {
  const eligible = ref(state.verified)
  state.setEligibility = value => { eligible.value = value }
  return { isVerified: eligible, isPageAccount: ref(state.page) }
})
const button = defineComponent({ props: ['label', 'to'], template: '<a v-if="to" :href="to">{{ label }}</a><button v-else>{{ label }}</button>' })
async function mountSettings() {
  return mountSuspended(SettingsFitness, { global: { stubs: {
    Button: button, Icon: true,
    AppPersonAccountSwitchPrompt: { template: '<p>Switch to your personal account</p>' },
  } } })
}
const page = { connections: [], units: 'us', stravaEnabled: false }

describe('Fitness settings access and recovery', () => {
  beforeEach(() => {
    state.fetch.mockReset().mockResolvedValue(page)
    state.toast.mockReset()
    state.verified = true
    state.page = false
  })
  it('explains HealthKit to unverified members without sending a forbidden request', async () => {
    state.verified = false
    const view = await mountSettings()
    await flushPromises()
    expect(view.text()).toContain('Apple Health · HealthKit')
    expect(view.text()).toContain('does not write to Apple Health')
    expect(view.text()).toContain('only visible to you unless you choose to share')
    expect(view.text()).toContain('You choose the audience for each post')
    expect(view.find('a[href="/tiers"]').exists()).toBe(false)
    expect(view.find('a[href="/settings/verification"]').text()).toBe('Verify account')
    expect(state.fetch).not.toHaveBeenCalled()
    view.unmount()
  })
  it('shows connections without an upsell for an eligible member', async () => {
    const view = await mountSettings()
    await flushPromises()
    expect(state.fetch).toHaveBeenCalledTimes(1)
    expect(view.text()).toContain('Apple Health connection')
    expect(view.text()).not.toContain('Explore Premium')
    expect(view.text()).not.toContain('Verify account')
    view.unmount()
  })
  it('loads connections when verification arrives', async () => {
    state.verified = false
    const view = await mountSettings()
    await flushPromises()
    expect(state.fetch).not.toHaveBeenCalled()
    state.setEligibility?.(true)
    await flushPromises()
    expect(state.fetch).toHaveBeenCalledTimes(1)
    expect(view.text()).toContain('Apple Health connection')
    expect(view.text()).not.toContain('Explore Premium')
    view.unmount()
  })
  it('keeps disclosure visible for page accounts and protects personal health data', async () => {
    state.page = true
    const view = await mountSettings()
    await flushPromises()
    expect(view.text()).toContain('Apple Health · HealthKit')
    expect(view.text()).toContain('Switch to your personal account')
    expect(state.fetch).not.toHaveBeenCalled()
    view.unmount()
  })
  it('shows disclosure while loading, then recovers from a network failure with Retry', async () => {
    let reject!: (error: Error) => void
    state.fetch.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail }))
    const view = await mountSettings()
    expect(view.text()).toContain('Checking connection')
    expect(view.text()).toContain('Apple Health · HealthKit')
    reject(new Error('Offline'))
    await flushPromises()
    expect(view.find('[role="alert"]').text()).toContain("Couldn't load fitness settings")
    await view.findAll('button').find(b => b.text() === 'Try again')!.trigger('click')
    await flushPromises()
    expect(state.fetch).toHaveBeenCalledTimes(2)
    expect(view.find('[role="alert"]').exists()).toBe(false)
    expect(view.text()).toContain('Apple Health cannot be connected in a browser')
    view.unmount()
  })
})
