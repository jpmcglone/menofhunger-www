import { computed, defineComponent, h, nextTick, ref, toRaw } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useChatThread, type UseChatThreadOptions } from '../../composables/chat/useChatThread'
import type { AuthUser } from '../../composables/useAuth'
import type { ComposerMediaItem } from '../../composables/composer/types'
import type { Message } from '../../types/api'

const mocks = vi.hoisted(() => ({ api: vi.fn(), sound: vi.fn(), storage: new Map<string, { revision: string; value: unknown }>() }))
vi.mock('~/composables/useSoundPolicy', () => ({ useSoundPolicy: () => ({ play: mocks.sound }) }))
vi.mock('~/composables/useApiClient', () => ({ useApiClient: () => ({ apiFetchData: (...args: unknown[]) => mocks.api(...args), apiFetch: (...args: unknown[]) => mocks.api(...args) }) }))
vi.mock('~/utils/channels/drafts', async importOriginal => ({
  ...await importOriginal<typeof import('../../utils/channels/drafts')>(),
  loadLocalDraft: async (key: string) => mocks.storage.get(key),
  saveLocalDraft: async (key: string, value: { revision: string; value: unknown } | null) => {
    if (value) mocks.storage.set(key, structuredClone(value)); else mocks.storage.delete(key)
  },
  clearChannelDraft: async (key: string, revision: string) => { if (mocks.storage.get(key)?.revision === revision) mocks.storage.delete(key) },
}))
function fixture() {
  const me = ref({ id: 'alice', username: 'alice', verifiedStatus: 'manual' } as AuthUser)
  const selected = ref<string | null>('one'), media = ref<ComposerMediaItem[]>([])
  let thread!: ReturnType<typeof useChatThread>
  const options: UseChatThreadOptions = {
    me, selectedConversationId: selected, selectedChatKey: selected, isDraftChat: computed(() => false),
    isGroupChat: computed(() => false), draftRecipients: ref([]), viewerCanStartChats: computed(() => true),
    showCantStartChat: async () => {}, prefersReducedMotion: ref(true), messagesScroller: ref(null),
    composer: { focus: vi.fn(), getMedia: () => [], clearMedia: () => { media.value = [] },
      getDraftMedia: () => media.value.map(item => ({ ...toRaw(item) })), restoreDraftMedia: value => { media.value = value } },
    scroll: { stickToBottom: vi.fn(), setAtBottomState: vi.fn(), refreshAtBottomFromScroller: () => true, isAtBottom: () => true },
    conversationsApi: { conversations: ref({ primary: [], requests: [] }), activeTab: ref('primary'),
      selectedConversation: computed(() => null), updateConversationForMessage: vi.fn(),
      updateConversationIsBlockedWith: vi.fn(), refreshAllConversationTabs: async () => {} },
    resetTyping: vi.fn(), emitMessagesTyping: vi.fn(), selectConversation: async id => { selected.value = id },
  }
  const wrapper = mount(defineComponent({ setup() { thread = useChatThread(options); return () => h('div') } }))
  return { me, selected, media, wrapper, get thread() { return thread } }
}
async function settle() { await nextTick(); await flushPromises(); await nextTick(); await flushPromises() }
beforeEach(() => { mocks.storage.clear(); mocks.api.mockReset(); mocks.sound.mockReset() })
describe('Chat destination drafts', () => {
  it('restores conversation text and attachments while isolating identities', async () => {
    const f = fixture(); await settle()
    f.thread.composerText.value = 'First conversation'
    f.media.value = [{ localId: 'gif', source: 'giphy', kind: 'gif', previewUrl: 'https://example.com/gif', url: 'https://example.com/gif' }]
    await settle(); f.selected.value = 'two'; await settle()
    expect(f.thread.composerText.value).toBe(''); expect(f.media.value).toEqual([])
    f.thread.composerText.value = 'Second conversation'; await settle()
    f.selected.value = 'one'; await settle()
    expect(f.thread.composerText.value).toBe('First conversation'); expect(f.media.value[0]?.localId).toBe('gif')
    f.me.value = { ...f.me.value, id: 'bob' }; await settle()
    expect(f.thread.composerText.value).toBe(''); expect(f.media.value).toEqual([])
    f.wrapper.unmount()
  })
  it('cannot restore a failed send into a different conversation', async () => {
    const f = fixture(); await settle()
    let reject!: (error: Error) => void
    mocks.api.mockImplementation(() => new Promise((_resolve, failure) => { reject = failure }))
    f.thread.composerText.value = 'Send to one'; await settle()
    const sending = f.thread.sendCurrentMessage(); await settle()
    f.selected.value = 'two'; await settle(); f.thread.composerText.value = 'Writing in two'; await settle()
    reject(new Error('Offline')); await sending; await settle()
    expect(mocks.sound).not.toHaveBeenCalled()
    expect(f.thread.composerText.value).toBe('Writing in two')
    f.selected.value = 'one'; await settle(); expect(f.thread.composerText.value).toBe('Send to one')
    f.wrapper.unmount()
  })
  it('plays a sent cue only after acknowledgment and invalidates it after switching', async () => {
    const f = fixture(); await settle()
    let resolve!: (value: unknown) => void
    mocks.api.mockImplementation(() => new Promise(done => { resolve = done }))
    f.thread.composerText.value = 'A message'; await settle()
    const sending = f.thread.sendCurrentMessage(); await settle()
    expect(mocks.sound).not.toHaveBeenCalled()
    resolve({ message: { id: 'sent', body: 'A message', conversationId: 'one', sender: { id: 'alice' } } })
    await sending; await settle()
    expect(mocks.sound).toHaveBeenCalledTimes(1)
    expect(mocks.sound.mock.calls[0]![0]).toBe('message-sent')
    const guard = mocks.sound.mock.calls[0]![1].valid
    expect(guard()).toBe(true)
    f.selected.value = 'two'
    expect(guard()).toBe(false)
    f.wrapper.unmount()
  })
  it('keeps a new-message draft separate from edit text', async () => {
    const f = fixture(); await settle()
    f.thread.composerText.value = 'Unsent draft'; await settle()
    f.thread.handleEdit({ id: 'old', body: 'Existing message', conversationId: 'one' } as Message)
    f.thread.composerText.value = 'Edited message'; await settle()
    f.thread.cancelEdit(); await settle()
    expect(f.thread.composerText.value).toBe('Unsent draft')
    f.selected.value = 'two'; await settle(); f.selected.value = 'one'; await settle()
    expect(f.thread.composerText.value).toBe('Unsent draft')
    f.wrapper.unmount()
  })
})
