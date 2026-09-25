import { defineComponent, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Gate from '~/components/app/OnboardingGate.vue'
const state = vi.hoisted(() => ({ user: null as any, fetch: vi.fn(), finish: vi.fn(), referral: null as any }))
mockNuxtImport('useAuth', () => () => ({ user: state.user, ensureLoaded: async () => {} }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: state.fetch }))
mockNuxtImport('useFirstRunFlow', () => () => ({ startAfterOnboarding: state.finish }))
mockNuxtImport('useReferralCapture', () => () => ({ capturedReferralCode: state.referral, appliedReferralCode: ref(''), markReferralApplied: vi.fn(), clearReferralCapture: vi.fn() }))
mockNuxtImport('usePostHog', () => () => ({ capture: vi.fn() }))
mockNuxtImport('useUsernameField', () => () => ({ status: ref('available'), helperText: ref('Available'), isCaseOnlyChange: ref(true) }))
const Input = defineComponent({ props: ['modelValue'], emits: ['update:modelValue'], template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' })
const Checkbox = defineComponent({ props: ['modelValue'], emits: ['update:modelValue'], template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />' })
async function render() {
  return mountSuspended(Gate, { global: { stubs: { Teleport: true, InputText: Input, AppDateOfBirthInput: Input, Checkbox, AppInlineAlert: { template: '<div role="alert"><slot /></div>' }, Button: defineComponent({ props: ['label', 'disabled'], template: '<button :disabled="disabled">{{ label }}</button>' }) } } })
}
beforeEach(() => {
  vi.clearAllMocks()
  state.user = ref({ id: 'fixture', username: 'fixture', usernameIsSet: false, birthdate: null, interests: [], menOnlyConfirmed: false })
  state.referral = ref('')
  state.fetch.mockImplementation(async (_path, options) => ({ user: { ...state.user.value, ...options.body, usernameIsSet: true } }))
})
describe('required signup flow', () => {
  it('saves essentials together, shows every arena, and ends directly at the feed', async () => {
    const view = await render()
    expect(view.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    await view.get('#setup-birthday').setValue('1990-01-15')
    await view.get('input[type="checkbox"]').setValue(true)
    await view.get('form').trigger('submit')
    await flushPromises()
    expect(state.fetch).toHaveBeenCalledWith('/users/me/onboarding', expect.objectContaining({ body: { username: 'fixture', birthdate: '1990-01-15', menOnlyConfirmed: true } }))
    expect(view.findAll('.arena-choice')).toHaveLength(7)
    expect(view.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    for (const arena of view.findAll('.arena-choice')) await arena.trigger('click')
    expect(view.findAll('.arena-selected')).toHaveLength(7)
    await view.get('form').trigger('submit')
    await flushPromises()
    expect(state.user.value.interests.length).toBeLessThanOrEqual(30)
    expect(state.finish).toHaveBeenCalledTimes(1)
    expect(view.find('[role="dialog"]').exists()).toBe(false)
    view.unmount()
  })
  it('retains editable details after a failed save and allows retry', async () => {
    state.fetch.mockRejectedValue(new Error('offline'))
    const view = await render()
    await view.get('#setup-birthday').setValue('1990-01-15')
    await view.get('input[type="checkbox"]').setValue(true)
    await view.get('form').trigger('submit')
    await flushPromises()
    expect(view.find('[role="alert"]').exists()).toBe(true)
    expect((view.get('#setup-birthday').element as HTMLInputElement).value).toBe('1990-01-15')
    expect(view.get('button[type="submit"]').attributes('disabled')).toBeUndefined()
    expect(state.finish).not.toHaveBeenCalled()
    view.unmount()
  })
})
