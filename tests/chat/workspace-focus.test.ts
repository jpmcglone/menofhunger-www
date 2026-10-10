import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Workspace from '~/components/app/chat/ChatWorkspace.vue'

const context = vi.hoisted(() => ({ chat: null as unknown as Record<string, unknown> }))
vi.mock('~/composables/pages/chat/useChatPage', () => ({ useChatPage: () => context.chat }))
mockNuxtImport('useHydratedMediaQuery', () => () => ref(false))

const Composer = defineComponent({
  setup(_props, { expose }) {
    const input = ref<HTMLInputElement | null>(null)
    expose({ focus: () => input.value?.focus() })
    return () => h('input', { ref: input, 'aria-label': 'Type a chat' })
  },
})
const Blank = defineComponent({ setup: () => () => h('span') })
function fixture() {
  const selectedChatKey = ref<string | null>(null)
  context.chat = {
    chatBootState: ref('ready'), isTinyViewport: ref(true), showChatPane: ref(true), showListPane: ref(false),
    selectedChatKey, composerBarRef: ref(null), threadPaneRef: ref(null), selectedConversationId: ref(null), selectedConversation: ref(null),
    atBottom: ref(true), isLatestWindow: ref(true), isSelectedConversationMarv: ref(false), isTabBarMode: ref(false),
    marv: { isAvailable: ref(false) }, callSession: { minimized: ref(false) }, composerText: ref(''),
    thread: { loadError: ref(null) }, messages: ref([]), isDraftChat: ref(false), draftRecipients: ref([]),
    getConversationTitle: () => 'Chat', infoModalVisible: ref(false), infoMessage: ref(null),
  }
  const element = document.createElement('div')
  document.body.append(element)
  const wrapper = mount(Workspace, {
    attachTo: element, props: { embedded: true, visible: true, focused: true, focusRequest: 1 },
    global: { stubs: { AppPageContent: { template: '<div><slot /></div>' }, ChatThreadHeader: Blank, ChatThreadPane: Blank, ChatComposerBar: Composer, ChatMessageInfoModal: Blank, Dialog: Blank, AppFormField: Blank, Button: Blank } },
  })
  return { wrapper, selectedChatKey }
}
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks() })

describe('explicit dock composer focus', () => {
  it('focuses a freshly opened chat after its data and composer become ready, then refocuses the existing composer', async () => {
    const { wrapper, selectedChatKey } = fixture()
    expect(document.querySelector('input')).toBeNull()
    selectedChatKey.value = 'a'; await nextTick(); await nextTick()
    const input = document.querySelector('input')!
    expect(document.activeElement).toBe(input)
    input.blur()
    await wrapper.setProps({ focused: false })
    await wrapper.setProps({ focused: true })
    expect(document.activeElement).not.toBe(input)
    await wrapper.setProps({ focusRequest: 2 })
    expect(document.activeElement).toBe(input)
    input.blur()
    await wrapper.setProps({ visible: false })
    await wrapper.setProps({ visible: true })
    expect(document.activeElement).not.toBe(input)
    wrapper.unmount()
  })

  it('does not steal focus for automatic arrivals or hidden conversations', async () => {
    const { wrapper, selectedChatKey } = fixture()
    await wrapper.setProps({ focusRequest: 0, focused: false })
    selectedChatKey.value = 'a'; await nextTick(); await nextTick()
    const input = document.querySelector('input')!
    expect(document.activeElement).not.toBe(input)
    await wrapper.setProps({ focusRequest: 1, focused: true, visible: false })
    expect(document.activeElement).not.toBe(input)
    await wrapper.setProps({ visible: true })
    expect(document.activeElement).toBe(input)
    wrapper.unmount()
  })
})
