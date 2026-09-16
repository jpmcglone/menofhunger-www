import { defineComponent, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import FirstRunProfileSheet from '~/components/app/FirstRunProfileSheet.vue'

const photoSpies = vi.hoisted(() => ({ fetch: vi.fn(), put: vi.fn(), finish: vi.fn(), patch: vi.fn() }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: photoSpies.fetch }))
mockNuxtImport('useFirstRunFlow', () => () => ({ step: ref('profile'), finishProfile: photoSpies.finish }))
mockNuxtImport('useAuth', () => () => ({ user: ref({ id: 'fixture', name: 'Test', avatarUrl: '/old.png' }), patchUser: photoSpies.patch }))
vi.mock('~/utils/put-presigned-file', () => ({ putPresignedFile: photoSpies.put }))
const Crop = defineComponent({ name: 'Crop', props: ['modelValue', 'file'], emits: ['cancel', 'cropped', 'update:modelValue'], template: '<div v-if="modelValue" data-crop />' })
async function render() {
  return mountSuspended(FirstRunProfileSheet, { global: { stubs: {
    AppModal: { template: '<section data-profile><slot /><slot name="footer" /></section>' },
    AppProfileEditAvatarCropDialog: Crop,
    AppAvatarCircle: defineComponent({ props: ['src'], template: '<img :src="src" />' }),
    Button: defineComponent({ props: ['label', 'disabled'], template: '<button :disabled="disabled">{{ label }}</button>' }),
    InputText: true, Icon: true,
  } } })
}
async function pick(view: Awaited<ReturnType<typeof render>>, file: File) {
  const input = view.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cropped')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  photoSpies.fetch.mockImplementation(async (path: string) => path.endsWith('/init')
    ? { key: 'avatars/fixture/avatar.jpg', uploadUrl: 'https://fixture.invalid/upload', headers: {} }
    : { user: { id: 'fixture', name: 'Test', avatarUrl: '/saved.jpg' } })
})
describe('onboarding profile photo crop', () => {
  it('opens the shared crop phase before staging or uploading; Cancel keeps the original photo', async () => {
    const view = await render()
    const original = new File(['original'], 'photo.jpg', { type: 'image/jpeg' })
    await pick(view, original)
    expect(view.findComponent(Crop).props('file')).toStrictEqual(original)
    expect(view.find('[data-crop]').exists()).toBe(true)
    expect(view.find('[data-profile]').exists()).toBe(false)
    expect(photoSpies.fetch).not.toHaveBeenCalled()
    view.findComponent(Crop).vm.$emit('cancel')
    await flushPromises()
    expect(view.find('img').attributes('src')).toBe('/old.png')
    expect(view.find('[data-crop]').exists()).toBe(false)
    await pick(view, original)
    expect(view.find('[data-crop]').exists()).toBe(true)
    view.unmount()
  })
  it('uploads only the applied crop when Done is pressed', async () => {
    const view = await render()
    await pick(view, new File(['original'], 'photo.jpg', { type: 'image/jpeg' }))
    const cropped = new File(['crop'], 'avatar.jpg', { type: 'image/jpeg' })
    view.findComponent(Crop).vm.$emit('cropped', cropped)
    await flushPromises()
    expect(view.find('img').attributes('src')).toBe('blob:cropped')
    expect(photoSpies.fetch).not.toHaveBeenCalled()
    await view.find('button').trigger('click')
    await flushPromises()
    expect(photoSpies.put).toHaveBeenCalledWith('https://fixture.invalid/upload', {}, cropped)
    expect(photoSpies.finish).toHaveBeenCalledTimes(1)
    view.unmount()
  })
  it('keeps the previous applied crop when a replacement crop is cancelled', async () => {
    const view = await render()
    const cropped = new File(['crop'], 'avatar.jpg', { type: 'image/jpeg' })
    await pick(view, cropped)
    view.findComponent(Crop).vm.$emit('cropped', cropped)
    await flushPromises()
    await pick(view, new File(['replacement'], 'next.png', { type: 'image/png' }))
    view.findComponent(Crop).vm.$emit('cancel')
    await flushPromises()
    await view.find('button').trigger('click')
    await flushPromises()
    expect(photoSpies.put).toHaveBeenCalledWith('https://fixture.invalid/upload', {}, cropped)
    view.unmount()
  })
})
