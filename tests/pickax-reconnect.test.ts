import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import Settings from '~/components/settings/sections/SettingsIntegrationsSection.vue'

const pickaxSpies = vi.hoisted(() => ({ connect: vi.fn(), disconnect: vi.fn(), refresh: vi.fn(), status: { value: null as unknown } }))
mockNuxtImport('usePickaxIntegration', () => () => ({ ...pickaxSpies, status: pickaxSpies.status }))
mockNuxtImport('useXIntegration', () => () => ({ status: ref(null), refresh: vi.fn() }))
mockNuxtImport('useAppToast', () => () => ({ push: vi.fn() }))

describe('Pickax reconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pickaxSpies.status = ref({ available: true, connected: true, username: 'alice', needsAttention: true, lastError: 'Connection needs attention.' })
  })
  it('opens the key form without disconnecting and Cancel restores the account view', async () => {
    const wrapper = await mountSuspended(Settings, { global: { stubs: { SettingsPartnerConnections: true, Icon: true } } })
    try {
      const button = (label: string) => wrapper.findAll('button').find(b => b.text() === label)!
      expect(wrapper.text()).toContain('Connection needs attention.')
      await button('Reconnect').trigger('click')
      expect(wrapper.find('form').exists()).toBe(true)
      expect(wrapper.text()).toContain('Your current connection stays in place')
      expect(pickaxSpies.disconnect).not.toHaveBeenCalled()
      await button('Cancel').trigger('click')
      expect(wrapper.find('form').exists()).toBe(false)
      expect(wrapper.text()).toContain('@alice')
    } finally { wrapper.unmount() }
  })
  it('keeps the form open through proof steps and closes only after a healthy connection', async () => {
    const wrapper = await mountSuspended(Settings, { global: { stubs: { SettingsPartnerConnections: true, Icon: true } } })
    try {
      await wrapper.findAll('button').find(b => b.text() === 'Reconnect')!.trigger('click')
      const inputs = wrapper.findAll('input')
      await inputs[0]!.setValue('key')
      await inputs[1]!.setValue('secret')
      pickaxSpies.connect.mockResolvedValue({ connected: true, needsAttention: true, needsUsername: true, verificationCode: 'moh-verify-test' })
      await wrapper.get('form').trigger('submit')
      expect(wrapper.text()).toContain('moh-verify-test')
      expect(wrapper.get('input[type="password"]').element).toHaveProperty('value', 'secret')
      pickaxSpies.connect.mockResolvedValue({ connected: true, needsAttention: false, needsUsername: false, verificationCode: null })
      await wrapper.get('form').trigger('submit')
      expect(wrapper.find('form').exists()).toBe(false)
      expect(pickaxSpies.disconnect).not.toHaveBeenCalled()
    } finally { wrapper.unmount() }
  })
})
