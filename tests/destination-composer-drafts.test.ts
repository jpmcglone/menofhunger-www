import { defineComponent, h, nextTick, onMounted, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useDestinationComposerDraft } from '../composables/composer/useDestinationComposerDraft'
import { loadLocalDraft, saveLocalDraft } from '~/utils/channels/drafts'

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
  it('restores an existing audience draft when there is no current content to move', async () => {
    storage.set('alice:verified', { revision: 'saved', value: { text: 'Saved verified draft' } })
    const f = fixture(); await settle()
    f.state.changeDestination(() => { f.key.value = 'alice:verified' })
    await settle()
    expect(f.text.value).toBe('Saved verified draft')
    expect(storage.get('alice:verified')?.value.text).toBe('Saved verified draft')
    f.wrapper.unmount()
  })
  it('keeps seeded content when the audience changes during initial draft loading', async () => {
    const load = vi.mocked(loadLocalDraft)
    const original = load.getMockImplementation()!
    let release!: () => void
    const pending = new Promise<void>(resolve => { release = resolve })
    load.mockImplementation(async key => { await pending; return original(key) })
    const f = fixture(true)
    try {
      await settle()
      expect(f.state.loading.value).toBe(true)
      expect(f.text.value).toBe('Explicit group post')
      f.state.changeDestination(() => { f.key.value = 'alice:verified' })
      expect(f.text.value).toBe('Explicit group post')
      expect(f.state.loading.value).toBe(false)
      release(); await settle()
      expect(f.text.value).toBe('Explicit group post')
      expect(storage.get('alice:verified')?.value.text).toBe('Explicit group post')
    } finally {
      release()
      load.mockImplementation(original)
      f.wrapper.unmount()
    }
  })
  it.each([false, true])('protects new typing during an empty audience restore (navigate away: %s)', async navigateAway => {
    const f = fixture(); await settle()
    storage.set('alice:verified', { revision: 'old', value: { text: 'Older saved draft' } })
    const load = vi.mocked(loadLocalDraft)
    const original = load.getMockImplementation()!
    let release!: () => void
    const pending = new Promise<void>(resolve => { release = resolve })
    load.mockImplementation(async key => { await pending; return original(key) })
    try {
      f.state.changeDestination(() => { f.key.value = 'alice:verified' })
      expect(f.state.loading.value).toBe(true)
      expect(f.state.blockingLoad.value).toBe(false)
      f.text.value = 'New typing while loading'; await settle()
      if (navigateAway) f.key.value = 'bob:public'
      release(); await settle()
      expect(f.text.value).toBe(navigateAway ? '' : 'New typing while loading')
      expect(storage.get('alice:verified')?.value.text).toBe('New typing while loading')
    } finally {
      release()
      load.mockImplementation(original)
      f.wrapper.unmount()
    }
  })
  it('moves the current composition across audiences without restoring or disabling it', async () => {
    storage.set('alice:group', { revision: 'older', value: { text: 'Older group draft' } })
    const f = fixture(); await settle()
    f.text.value = 'Keep writing https://example.com'; await settle()
    for (const key of ['alice:verified', 'alice:group', 'alice:public']) {
      const oldKey = f.key.value!
      f.state.changeDestination(() => { f.key.value = key })
      expect(f.text.value).toBe('Keep writing https://example.com')
      expect(f.state.loading.value).toBe(false)
      await settle()
      expect(storage.get(key)?.value.text).toBe(f.text.value)
      expect(storage.has(oldKey)).toBe(false)
    }
    // Account/navigation changes must still isolate drafts.
    f.key.value = 'bob:public'; await settle()
    expect(f.text.value).toBe('')
    f.wrapper.unmount()
  })
  it('moves once to the final destination during rapid multi-field audience changes', async () => {
    const f = fixture(); await settle()
    f.text.value = 'In progress'; await settle()
    f.state.changeDestination(() => { f.key.value = 'alice:intermediate'; f.key.value = 'alice:group' })
    f.state.changeDestination(() => { f.key.value = 'alice:verified' })
    await settle()
    expect(f.text.value).toBe('In progress')
    expect([...storage.keys()]).toEqual(['alice:verified'])
    f.wrapper.unmount()
  })
  it('keeps the original saved draft when saving a changed audience fails', async () => {
    const f = fixture(); await settle()
    f.text.value = 'Recoverable'; await settle()
    const save = vi.mocked(saveLocalDraft)
    const original = save.getMockImplementation()!
    save.mockImplementation(async () => { throw new Error('Storage unavailable') })
    try {
      f.state.changeDestination(() => { f.key.value = 'alice:group' })
      await settle()
      expect(f.text.value).toBe('Recoverable')
      expect(storage.get('alice:public')?.value.text).toBe('Recoverable')
      expect(f.state.saved.value).toBe(false)
    } finally {
      save.mockImplementation(original)
      f.wrapper.unmount()
    }
  })
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
