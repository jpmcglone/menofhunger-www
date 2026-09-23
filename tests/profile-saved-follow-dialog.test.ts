import { ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ProfileSavedFollowDialog from '~/components/app/profile/ProfileSavedFollowDialog.vue'

const state = vi.hoisted(() => ({ fetch: vi.fn(), user: null as unknown }))
mockNuxtImport('useApiClient', () => () => ({ apiFetch: state.fetch }))
mockNuxtImport('useAuth', () => () => ({ user: state.user }))
let wrapper: VueWrapper

beforeEach(() => {
  vi.resetAllMocks()
  state.user = ref({ id: 'viewer' })
})
afterEach(() => wrapper?.unmount())

function render(open = false) {
  wrapper = mount(ProfileSavedFollowDialog, {
    props: { modelValue: open },
    global: { stubs: {
      AppModal: { props: ['modelValue'], template: '<section v-if="modelValue"><slot /></section>' },
      AppSubtleSectionLoader: { props: ['loading', 'refreshing'], template: '<div :data-loading="loading" :data-refreshing="refreshing"><slot v-if="!loading" /></div>' },
      AppWhoToFollowCompactRow: { props: ['user'], template: '<div>{{ user.name }}</div>' },
      Button: { props: ['label'], template: '<button>{{ label }}</button>' },
    } },
  })
  return wrapper
}

it('opens on save and loads suggestions instead of treating an unrequested list as empty', async () => {
  let respond!: (value: unknown) => void
  state.fetch.mockImplementation(() => new Promise(resolve => { respond = resolve }))
  render()
  expect(state.fetch).not.toHaveBeenCalled()
  await wrapper.setProps({ modelValue: true })
  expect(wrapper.find('section').exists()).toBe(true)
  expect(wrapper.find('[data-loading="true"]').exists()).toBe(true)
  expect(state.fetch).toHaveBeenCalledWith('/follows/recommendations', expect.objectContaining({ query: { limit: 5, seed: expect.any(String) } }))
  respond({ data: [{ id: 'other', name: 'Someone to follow' }] })
  await flushPromises()
  expect(wrapper.text()).toContain('Someone to follow')
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
})

it('keeps failures visible and lets the user retry without saving again', async () => {
  let offline = true
  state.fetch.mockImplementation(async () => {
    if (offline) throw new Error('offline')
    return { data: [{ id: 'other', name: 'Recovered suggestion' }] }
  })
  render(true)
  await flushPromises()
  expect(wrapper.find('[role="alert"]').exists()).toBe(true)
  offline = false
  await wrapper.find('button').trigger('click')
  await flushPromises()
  expect(wrapper.text()).toContain('Recovered suggestion')
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
})

it('only shows an empty state after the server confirms there are no suggestions', async () => {
  state.fetch.mockResolvedValue({ data: [] })
  render(true)
  await flushPromises()
  expect(wrapper.text()).toContain('You’re all caught up')
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
})

it('retains established suggestions while fetching a fresh list on the next save', async () => {
  let respond!: (value: unknown) => void
  let pending = false
  state.fetch.mockImplementation(() => pending ? new Promise(resolve => { respond = resolve }) : Promise.resolve({ data: [{ id: 'other', name: 'Established suggestion' }] }))
  render(true)
  await flushPromises()
  await wrapper.setProps({ modelValue: false })
  pending = true
  await wrapper.setProps({ modelValue: true })
  expect(wrapper.text()).toContain('Established suggestion')
  expect(wrapper.find('[data-refreshing="true"]').exists()).toBe(true)
  respond({ data: [{ id: 'new', name: 'Fresh suggestion' }] })
  await flushPromises()
  expect(wrapper.text()).toContain('Fresh suggestion')
})
