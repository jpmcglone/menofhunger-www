import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import Settings from '~/components/settings/sections/SettingsIntegrationsSection.vue'

const pickaxSpies = vi.hoisted(() => ({ connect: vi.fn(), reconnect: vi.fn(), disconnect: vi.fn(), refresh: vi.fn(), toast: vi.fn(), status: { value: null as unknown } }))
mockNuxtImport('usePickaxIntegration', () => () => ({ ...pickaxSpies, status: pickaxSpies.status }))
mockNuxtImport('useXIntegration', () => () => ({ status: ref(null), refresh: vi.fn() }))
mockNuxtImport('useAppToast', () => () => ({ push: pickaxSpies.toast }))

const options = { global: { stubs: { SettingsPartnerConnections: true, Icon: true } } }
describe('Pickax reconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pickaxSpies.reconnect.mockReset().mockResolvedValue({ connected: true, needsAttention: false })
    pickaxSpies.status = ref({ available: true, connected: true, username: 'alice', needsAttention: true, lastError: 'Connection needs attention.' })
  })
  it('reconnects with saved credentials without displaying a key form or disconnecting', async () => {
    const wrapper = await mountSuspended(Settings, options)
    try {
      await wrapper.findAll('button').find(b => b.text() === 'Reconnect')!.trigger('click')
      expect(pickaxSpies.reconnect).toHaveBeenCalledWith()
      expect(pickaxSpies.connect).not.toHaveBeenCalled()
      expect(pickaxSpies.disconnect).not.toHaveBeenCalled()
      expect(wrapper.find('form').exists()).toBe(false)
      expect(wrapper.text()).toContain('saved Client ID and secret')
      expect(pickaxSpies.toast).toHaveBeenCalledWith({ title: 'Pickax reconnected.', tone: 'success' })
    } finally { wrapper.unmount() }
  })
  it('keeps Disconnect available when reconnecting fails', async () => {
    pickaxSpies.reconnect.mockRejectedValue(new Error('Pickax rejected the saved key.'))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = await mountSuspended(Settings, options)
    try {
      await wrapper.findAll('button').find(b => b.text() === 'Reconnect')!.trigger('click')
      expect(pickaxSpies.toast).not.toHaveBeenCalled()
      expect(wrapper.find('form').exists()).toBe(false)
      await wrapper.findAll('button').find(b => b.text() === 'Disconnect')!.trigger('click')
      expect(confirm).toHaveBeenCalled()
      expect(pickaxSpies.disconnect).toHaveBeenCalledTimes(1)
    } finally { wrapper.unmount(); confirm.mockRestore() }
  })
})
