import { defineComponent, h, nextTick, onMounted, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDestinationComposerDraft } from '../composables/composer/useDestinationComposerDraft'

const storage = vi.hoisted(() => new Map<string, { revision: string; value: { text: string } }>())
vi.mock('~/utils/channels/drafts', () => ({
  loadLocalDraft: vi.fn(async (key: string) => storage.get(key)),
  saveLocalDraft: vi.fn(async (key: string, value: { revision: string; value: { text: string } } | null) => {
    if (value) storage.set(key, structuredClone(value)); else storage.delete(key)
  }),
  clearChannelDraft: vi.fn(async (key: string, revision: string) => { if (storage.get(key)?.revision === revision) storage.delete(key) }),
}))
function fixture(initial = false) {
  const key = ref<string | null>('alice:public'), text = ref('')
  let state!: ReturnType<typeof useDestinationComposerDraft<{ text: string }>>
  const wrapper = mount(defineComponent({ setup() {
    state = useDestinationComposerDraft({ key, snapshot: () => ({ text: text.value }), restore: value => { text.value = value?.text ?? '' }, hasContent: () => !!text.value, preserveInitial: () => initial })
    onMounted(() => { if (initial) { key.value = 'alice:group'; text.value = 'Explicit group post' } })
    return () => h('textarea', { value: text.value })
  } }))
  return { key, text, wrapper, get state() { return state } }
}
async function settle() { await nextTick(); await flushPromises(); await nextTick(); await flushPromises() }
beforeEach(() => storage.clear())
describe('local destination composer drafts', () => {
  it('restores distinct audiences and identities without transferring text', async () => {
    const f = fixture(); await settle()
    f.text.value = 'Public draft'; await settle()
    f.key.value = 'alice:group'; await settle(); expect(f.text.value).toBe('')
    f.text.value = 'Group draft'; await settle()
    f.key.value = 'bob:group'; await settle(); expect(f.text.value).toBe('')
    f.key.value = 'alice:public'; await settle(); expect(f.text.value).toBe('Public draft')
    f.key.value = 'alice:group'; await settle(); expect(f.text.value).toBe('Group draft')
    f.wrapper.unmount()
  })
  it('seeds explicit content into its actual initial destination', async () => {
    storage.set('alice:public', { revision: 'old-public', value: { text: 'Existing public' } })
    const f = fixture(true); await settle()
    expect(f.text.value).toBe('Explicit group post')
    expect(storage.get('alice:group')?.value.text).toBe('Explicit group post')
    expect(storage.get('alice:public')?.value.text).toBe('Existing public')
    f.wrapper.unmount()
  })
  it('retains submitted text until success and cannot erase a newer draft', async () => {
    const f = fixture(); await settle()
    f.text.value = 'First message'; await settle(); const first = f.state.capture()
    f.text.value = ''; await settle(); expect(storage.get('alice:public')?.value.text).toBe('First message')
    f.text.value = 'Next message'; await settle()
    await f.state.submitted(first)
    expect(storage.get('alice:public')?.value.text).toBe('Next message')
    expect(f.state.unchanged(first)).toBe(false)
    f.wrapper.unmount()
  })
  it('clears only the submitted destination after navigation', async () => {
    const f = fixture(); await settle()
    f.text.value = 'Send this'; await settle(); const sent = f.state.capture()
    f.text.value = ''; await settle(); f.key.value = 'alice:group'; await settle()
    f.text.value = 'Keep this'; await settle(); await f.state.submitted(sent)
    expect(storage.has('alice:public')).toBe(false)
    expect(storage.get('alice:group')?.value.text).toBe('Keep this')
    f.wrapper.unmount()
  })
})
