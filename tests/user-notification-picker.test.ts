import { defineComponent } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Picker from '~/components/app/profile/UserNotificationPreferences.vue'

const pickerSpies = vi.hoisted(() => ({ fetch: vi.fn(), save: vi.fn(), set: vi.fn(), toast: vi.fn() }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: pickerSpies.fetch }))
mockNuxtImport('useFollowState', () => () => ({ set: pickerSpies.set, setNotificationPreference: pickerSpies.save }))
mockNuxtImport('useAppToast', () => () => ({ push: pickerSpies.toast }))
mockNuxtImport('useAuth', () => () => ({ user: { value: { id: 'viewer' } } }))
const button = defineComponent({ props: ['label', 'disabled'], template: '<button :disabled="disabled"><slot />{{ label }}</button>' })
async function mountPicker() {
  return await mountSuspended(Picker, {
    props: { modelValue: true, person: { id: 'author', username: 'alex', name: 'Alex' } },
    global: { stubs: {
      AppComposerSelectionDialog: { template: '<div><slot name="header"/><slot/><slot name="footer"/></div>' },
      AppComposerSelectionRow: { props: ['label', 'selected'], emits: ['select'], template: `<button role="radio" :aria-checked="selected" @click="$emit('select')">{{ label }}</button>` },
      AppInlineAlert: { template: '<div role="alert"><slot/></div>' },
      AppUserAvatar: true, Button: button, AppActionButton: button,
    } },
  })
}
describe('user notification picker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    pickerSpies.fetch.mockResolvedValue({ viewerFollowsUser: true, userFollowsViewer: false, viewerNotificationPreference: 'posts' })
    pickerSpies.save.mockResolvedValue({ preference: 'off', enabled: false })
  })
  it('loads the saved choice, persists Off, and closes only after success', async () => {
    const wrapper = await mountPicker()
    await flushPromises()
    expect(wrapper.findAll('[role="radio"]')[1]!.attributes('aria-checked')).toBe('true')
    await wrapper.findAll('[role="radio"]')[2]!.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === 'Save preferences')!.trigger('click')
    await flushPromises()
    expect(pickerSpies.save).toHaveBeenCalledWith({ userId: 'author', username: 'alex', preference: 'off' })
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })
  it('keeps the selected choice and dialog open after a failed save', async () => {
    pickerSpies.save.mockRejectedValue(new Error('Network unavailable'))
    const wrapper = await mountPicker()
    await flushPromises()
    await wrapper.findAll('[role="radio"]')[2]!.trigger('click')
    await wrapper.findAll('button').find(button => button.text() === 'Save preferences')!.trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    expect(wrapper.findAll('[role="radio"]')[2]!.attributes('aria-checked')).toBe('true')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    wrapper.unmount()
  })
  it('does not populate shared state after closing during a load', async () => {
    let finish!: (value: unknown) => void
    pickerSpies.fetch.mockReturnValue(new Promise(resolve => { finish = resolve }))
    const wrapper = await mountPicker()
    await wrapper.setProps({ modelValue: false })
    finish({ viewerFollowsUser: true, userFollowsViewer: false, viewerNotificationPreference: 'all' })
    await flushPromises()
    expect(pickerSpies.set).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
