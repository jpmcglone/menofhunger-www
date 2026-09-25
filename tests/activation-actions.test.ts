import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { computed, defineComponent, h, nextTick, provide, ref, type Ref } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { MOH_COMPOSER_OPEN_KEY } from '~/utils/injection-keys'
import HomeWelcomeCard from '~/components/app/feed/HomeWelcomeCard.vue'

const state = vi.hoisted(() => ({ guide: null as unknown, user: null as unknown, reply: null as unknown, addPhoto: vi.fn() }))
mockNuxtImport('useActivationGuide', () => () => state.guide)
mockNuxtImport('useAuth', () => () => ({ user: state.user }))
mockNuxtImport('useFirstRunFlow', () => () => ({ addPhoto: state.addPhoto, step: ref('none') }))
mockNuxtImport('useReplyModal', () => () => state.reply)
const pending = { phase: 'before_approval', verificationRequested: true, verificationPending: true, followed: false, contributed: false, replied: false, returned: false }
let progress: Ref<typeof pending>
let phase: Ref<string>
const cleanups: Array<() => void> = []
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear()
  progress = ref({ ...pending }); phase = ref('before_approval')
  state.user = ref({ id: 'one' })
  state.reply = { open: ref(false), show: vi.fn(), registerOnReplyPosted: () => () => {} }
  const dismissed = ref(false)
  state.guide = {
    progress, phase, dismissed, syncError: ref(false), sync: vi.fn(), dismiss: vi.fn(() => { dismissed.value = true }), track: vi.fn(),
    completedCount: computed(() => phase.value === 'approved' ? Number(progress.value.contributed) + Number(progress.value.replied) + Number(progress.value.returned) : Number(progress.value.verificationRequested) + Number(progress.value.followed)),
  }
})
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()))
const modal = defineComponent({
  props: ['modelValue', 'title'], emits: ['update:modelValue'],
  setup(props, { slots, emit }) {
    return () => props.modelValue ? h('div', { role: 'dialog' }, [h('h2', props.title), slots.default?.(), h('button', { onClick: () => emit('update:modelValue', false) }, 'Close')]) : null
  },
})
async function render(composerOpen = ref(false)) {
  const harness = defineComponent({ setup() {
    provide(MOH_COMPOSER_OPEN_KEY, composerOpen)
    return () => h(HomeWelcomeCard)
  } })
  const view = await mountSuspended(harness, { global: { stubs: {
    AppModal: modal,
    SettingsSectionsSettingsVerificationSection: { template: '<div>Verification form</div>' },
    AppFeedActivationPeople: { template: '<div>People list</div>' },
    AppFeedActivationConversations: { template: '<div>Conversation list</div>' },
  } } })
  cleanups.push(() => view.unmount())
  return view
}
it('opens verification and people in place without a route link', async () => {
  const view = await render()
  await view.findAll('button').find(b => b.text() === 'View request')!.trigger('click')
  expect(view.get('[role="dialog"]').text()).toContain('Verification form')
  expect(view.find('a[href="/verification"]').exists()).toBe(false)
  await view.findAll('button').find(b => b.text() === 'Close')!.trigger('click')
  await view.findAll('button').find(b => b.text() === 'Find people')!.trigger('click')
  expect(view.get('[role="dialog"]').text()).toContain('People list')
})
it('waits for confirmed completion and an open action to close, then celebrates only once', async () => {
  const view = await render()
  await view.findAll('button').find(b => b.text() === 'Find people')!.trigger('click')
  progress.value.followed = true
  await nextTick()
  expect(view.get('[role="dialog"]').text()).toContain('People list')
  await view.findAll('button').find(b => b.text() === 'Close')!.trigger('click')
  await flushPromises()
  expect(view.get('[role="dialog"]').text()).toContain('Good work. You’re all set.')
  await view.findAll('button').find(b => b.text() === 'Close')!.trigger('click')
  await flushPromises()
  expect(view.find('[role="dialog"]').exists()).toBe(false)
  const again = await render()
  expect(again.find('[role="dialog"]').exists()).toBe(false)
})
it('keeps return-on-another-day server owned and opens replies in place', async () => {
  phase.value = 'approved'
  progress.value = { ...pending, phase: 'approved', contributed: true, replied: true }
  const view = await render()
  expect(view.text()).toContain('2 of 3 complete')
  expect(view.find('[role="dialog"]').exists()).toBe(false)
  await view.findAll('button').find(b => b.text() === 'Find a conversation')!.trigger('click')
  expect(view.get('[role="dialog"]').text()).toContain('Conversation list')
})

it('defers celebration while the main composer is open', async () => {
  const composerOpen = ref(true)
  const view = await render(composerOpen)
  progress.value.followed = true
  await nextTick()
  expect(view.find('[role="dialog"]').exists()).toBe(false)
  composerOpen.value = false
  await flushPromises()
  expect(view.get('[role="dialog"]').text()).toContain('Good work. You’re all set.')
})

it.each(['Back to feed', 'Close'])('dismisses the completed guide when celebration closes with %s', async (label) => {
  const view = await render()
  progress.value.followed = true
  await flushPromises()
  const dialog = view.get('[role="dialog"]')
  await dialog.findAll('button').find(button => button.text() === label)!.trigger('click')
  await flushPromises()
  expect(view.find('[role="dialog"]').exists()).toBe(false)
  expect(view.find('[aria-label="Getting started"]').exists()).toBe(false)
  expect((state.guide as { dismiss: ReturnType<typeof vi.fn> }).dismiss).toHaveBeenCalledTimes(1)
})
