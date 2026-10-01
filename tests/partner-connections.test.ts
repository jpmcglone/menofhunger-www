import { defineComponent, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Connections from '~/components/settings/SettingsPartnerConnections.vue'

const state = vi.hoisted(() => ({ fetch: vi.fn() }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: state.fetch }))
mockNuxtImport('useAuth', () => () => ({ user: ref({ id: 'page', username: 'lodgepage' }) }))
const button = defineComponent({ props: ['label', 'disabled'], template: '<button :disabled="disabled">{{ label }}</button>' })
const grant = { id: 'grant', clientName: 'Pickax', accountId: 'page', status: 'needs_reauthorization', expiresAt: '2027-03-01T00:00:00Z' }
const delivery = { id: 'delivery', platform: 'pickax', action: 'remove', status: 'needs_attention', lastError: 'Remove the remote copy manually.', remoteUrl: 'https://pickax.com/post/fixture' }
async function mountConnections() {
  return mountSuspended(Connections, { global: { stubs: { Button: button, AppInlineAlert: { template: '<p role="alert"><slot /></p>' } } } })
}
describe('partner connection recovery', () => {
  beforeEach(() => { state.fetch.mockReset().mockImplementation(async (path: string, options?: { method?: string }) => {
    if (options?.method === 'DELETE') return { revoked: true }
    return path.endsWith('/deliveries') ? [delivery] : [grant]
  }) })
  it('shows paused page access and does not claim an unconfirmed removal succeeded', async () => {
    const view = await mountConnections()
    try {
      await flushPromises()
      expect(view.text()).toContain('Read access paused · Reconnect required')
      expect(view.text()).toContain('A current page operator must reconnect this app.')
      expect(view.text()).toContain('Removal needs attention')
      expect(view.text()).not.toContain('Remote copy removed')
      expect(view.get('a').attributes('href')).toBe(delivery.remoteUrl)
      await view.findAll('button').find(b => b.text() === 'Revoke access')!.trigger('click')
      await flushPromises()
      expect(state.fetch).toHaveBeenCalledWith('/me/connections/grant', { method: 'DELETE' })
      expect(view.text()).toContain('No connected apps')
      expect(view.text()).toContain('Removal needs attention')
    } finally { view.unmount() }
  })
  it('recovers from an unavailable API without inventing connection data', async () => {
    state.fetch.mockRejectedValue(new Error('Offline'))
    const view = await mountConnections()
    try {
      await flushPromises()
      expect(view.find('[role="alert"]').exists()).toBe(true)
      expect(view.text()).not.toContain('Read access paused')
      state.fetch.mockImplementation(async (path: string) => path.endsWith('/deliveries') ? [] : [grant])
      await view.findAll('button').find(b => b.text() === 'Try again')!.trigger('click')
      await flushPromises()
      expect(view.find('[role="alert"]').exists()).toBe(false)
      expect(view.text()).toContain('Read access paused')
    } finally { view.unmount() }
  })
})
