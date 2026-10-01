import { ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import PartnerReturn from '~/pages/connect/partner.vue'
const state = vi.hoisted(() => ({ authenticated: false }))
mockNuxtImport('useAuth', () => () => ({ isAuthed: ref(state.authenticated) }))
mockNuxtImport('useApiClient', () => () => ({ apiBaseUrl: 'https://api.menofhunger.example/v1' }))
describe('partner onboarding return', () => {
  it('mounts the existing onboarding gate without dropping the partner continuation', async () => {
    state.authenticated = true
    const interaction = 'synthetic_interaction_1234567890'
    const view = await mountSuspended(PartnerReturn, {
      route: `/connect/partner?interaction=${interaction}`,
      global: { stubs: { AppOnboardingGate: { template: '<div data-onboarding>Finish account setup</div>' } } },
    })
    try {
      expect(view.find('[data-onboarding]').exists()).toBe(true)
      expect(view.get('a').attributes('href')).toBe(`https://api.menofhunger.example/oauth/interaction/${interaction}`)
    } finally { view.unmount() }
  })
  it('does not mount account setup for a guest or turn an invalid continuation into a redirect', async () => {
    state.authenticated = false
    const view = await mountSuspended(PartnerReturn, {
      route: '/connect/partner?interaction=https://attacker.example',
      global: { stubs: { AppOnboardingGate: { template: '<div data-onboarding />' } } },
    })
    try {
      expect(view.find('[data-onboarding]').exists()).toBe(false)
      expect(view.find('a').exists()).toBe(false)
      expect(view.get('[role="alert"]').text()).toContain('missing or expired')
    } finally { view.unmount() }
  })
})
