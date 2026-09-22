import { ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AuthBootOverlay from '~/components/app/layout/AuthBootOverlay.vue'
import { rememberSessionIdentity } from '~/utils/session-identity-preview'
const bootState = vi.hoisted(() => ({ attempted: false, layout: 'default' }))
mockNuxtImport('useAuth', () => () => ({ didAttempt: ref(bootState.attempted) }))
mockNuxtImport('useRoute', () => () => ({ meta: { layout: bootState.layout } }))
async function render() {
  return mountSuspended(AuthBootOverlay, { global: { stubs: {
    ClientOnly: { template: '<div><slot /></div>' },
    AppLogo: true,
    AppIconGlyph: true,
    AppAvatarCircle: { props: ['sizeClass'], template: '<div class="boot-avatar" :class="sizeClass" />' },
  } } })
}
beforeEach(() => {
  bootState.attempted = false
  bootState.layout = 'default'
  localStorage.clear()
})
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
  it('shows the last signed-in avatar while that account loads', async () => {
    bootState.layout = 'app'
    rememberSessionIdentity({
      name: 'Jack McGlone',
      username: 'jack',
      avatarUrl: 'https://cdn.example.com/jack.jpg',
      isOrganization: false,
    })
    const view = await render()
    expect(view.find('[role="status"]').text()).toContain('Loading Jack McGlone')
    expect(view.find('.boot-avatar.h-28.w-28').exists()).toBe(true)
    view.unmount()
  })
  it('clears after an app-layout account check completes', async () => {
    bootState.layout = 'app'; bootState.attempted = true
    const view = await render()
    expect(view.find('[role="status"]').exists()).toBe(false)
    view.unmount()
  })
})
