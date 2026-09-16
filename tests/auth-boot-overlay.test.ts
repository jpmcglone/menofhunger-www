import { ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthBootOverlay from '~/components/app/layout/AuthBootOverlay.vue'
const bootState = vi.hoisted(() => ({ attempted: false, layout: 'default' }))
mockNuxtImport('useAuth', () => () => ({ didAttempt: ref(bootState.attempted) }))
mockNuxtImport('useRoute', () => () => ({ meta: { layout: bootState.layout } }))
async function render() {
  return mountSuspended(AuthBootOverlay, { global: { stubs: {
    ClientOnly: { template: '<div><slot /></div>' }, AppLogo: true,
  } } })
}
beforeEach(() => { bootState.attempted = false; bootState.layout = 'default' })
describe('account bootstrap overlay', () => {
  it('does not cover public pages that do not initialize an account', async () => {
    const view = await render()
    expect(view.find('[role="status"]').exists()).toBe(false)
    view.unmount()
  })
  it('shows while the app layout initializes its account', async () => {
    bootState.layout = 'app'
    const view = await render()
    expect(view.find('[role="status"]').text()).toContain('Loading your account')
    view.unmount()
  })
  it('clears after an app-layout account check completes', async () => {
    bootState.layout = 'app'; bootState.attempted = true
    const view = await render()
    expect(view.find('[role="status"]').exists()).toBe(false)
    view.unmount()
  })
})
