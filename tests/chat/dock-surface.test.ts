import { defineComponent, h, nextTick, reactive, ref, type Ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReturnTypeOfDock } from './dock-test-types'
import { openDockDraft, openDockSession, type DockSession } from '~/utils/chat-dock'
import Dock from '~/components/app/chat/ChatDesktopDock.vue'
import type { FollowListUser, Message, MessageConversation } from '~/types/api'
import type { MessagesCallback } from '~/composables/usePresence'

const context = vi.hoisted(() => ({ dock: null as unknown as ReturnTypeOfDock, route: null as unknown as { path: string; query: Record<string, string> }, mounts: [] as string[], navigation: vi.fn(), conversations: null as unknown as Ref<{ primary: MessageConversation[]; requests: MessageConversation[] }>, messages: null as MessagesCallback | null }))
vi.mock('~/composables/calls/useCallSession', () => ({ useCallSession: () => ({ call: ref(null), incoming: ref(null), minimized: ref(false) }) }))
vi.mock('~/composables/chat/useDesktopChatDock', () => ({ useDesktopChatDock: () => context.dock }))
vi.mock('~/composables/chat/useChatDockSounds', () => ({ useChatDockSounds: () => ({ open: vi.fn(), minimize: vi.fn(), close: vi.fn() }) }))
vi.mock('~/composables/presence/usePresenceCallback', () => ({ usePresenceCallback: (kind: string, callback: MessagesCallback) => {
  if (kind === 'Messages') context.messages = callback
  return { register: vi.fn(), unregister: vi.fn() }
} }))
mockNuxtImport('useRoute', () => () => context.route)
mockNuxtImport('navigateTo', () => context.navigation)
mockNuxtImport('useAuth', () => () => ({ user: ref({ id: 'me' }), isPageAccount: ref(false) }))
mockNuxtImport('usePresence', () => () => ({ emitMessagesScreen: vi.fn(), isSocketConnected: ref(false), addInterest: vi.fn(), removeInterest: vi.fn(), addMessagesCallback: vi.fn(), removeMessagesCallback: vi.fn() }))
mockNuxtImport('useSpaceLobby', () => () => ({ selectedSpaceId: ref(null), currentSpace: ref(null) }))

const Workspace = defineComponent({
  props: { conversationId: { type: String, default: null }, listOnly: Boolean, visible: Boolean, focused: Boolean, focusRequest: Number, openMarv: Boolean, embedded: Boolean, fullPage: Boolean, initialRecipients: Array, jumpMessageId: String },
  emits: ['state', 'select', 'draft'],
  setup(props, { expose, slots, emit }) {
    const text = ref('')
    context.mounts.push(props.conversationId ?? 'list')
    expose({ chat: { conversations: context.conversations, getDirectUser: (conversation: MessageConversation) => conversation.participants.find(participant => participant.user.id !== 'me')?.user ?? null, marv: { marvUserId: ref(null), isAvailable: ref(false) }, marvConversationId: ref(null), conversationsApi: { refreshAllConversationTabs: async () => {} } } })
    const conversation = context.conversations.value.primary.find(value => value.id === props.conversationId)
    emit('state', { conversationId: props.conversationId, atBottom: true, title: props.conversationId ?? 'MARV', dockable: conversation?.type !== 'crew_wall', marv: props.openMarv })
    return () => h('div', { 'data-session': props.conversationId ?? 'list', 'data-visible': String(props.visible), 'data-full-page': String(props.fullPage) }, [
      h('input', { value: text.value, onInput: (event: Event) => { text.value = (event.target as HTMLInputElement).value } }), slots.controls?.(),
    ])
  },
})

function fixture() {
  context.mounts = []
  context.navigation.mockClear()
  context.messages = null
  context.conversations = ref({ primary: ['a', 'b'].map((id, index) => ({ id, type: 'direct', viewerStatus: 'accepted', isMuted: false, unreadCount: index + 2, participants: [{ user: { id: `${id}-user`, name: id } }] } as MessageConversation)), requests: [] })
  context.route = reactive({ path: '/home', query: {} as Record<string, string> })
  const sessions = ref<DockSession[]>([])
  const focusedKey = ref<string | null>(null)
  const listExpanded = ref(false)
  context.dock = {
    width: ref(1440), desktop: ref(true), capacity: ref(2), sessions, focusedKey, focusRequest: ref(0), focusRequestKey: ref(null), listExpanded, popupsPaused: ref(false), fullHostReady: ref(false),
    open: (key, automatic = false) => { sessions.value = openDockSession(sessions.value, key, 2, automatic) },
    openDraft: recipients => { const opened = openDockDraft(sessions.value, recipients, 2); sessions.value = opened.sessions; return opened.key },
    setMode: (key, mode) => { sessions.value = sessions.value.map(session => session.key === key ? { ...session, mode } : session) },
    reset: () => { sessions.value = []; focusedKey.value = null },
  }
  const container = document.createElement('div')
  document.body.append(container)
  const Host = defineComponent({ setup() { return () => h('div', [context.route.path === '/chat' ? h('div', [h('div', { id: 'moh-chat-full-thread' }), h('div', { id: 'moh-chat-full-list' })]) : null, h(Dock)]) } })
  const wrapper = mount(Host, { attachTo: container, global: { stubs: { ChatWorkspace: Workspace, AppUserAvatar: { props: ['user', 'showPresence'], template: '<span :data-avatar-user="user.id" :data-presence="String(showPresence)" />' }, Icon: true, NuxtLink: { props: ['to'], template: '<a><slot /></a>' } } } })
  return { wrapper, dock: context.dock }
}
async function settle() { await nextTick(); await flushPromises(); await nextTick() }
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks() })

describe('mounted dock surfaces', () => {
  it('places the newest expanded conversation on the far left', async () => {
    const { wrapper, dock } = fixture()
    await settle()
    dock.open('a'); await settle(); dock.open('b'); await settle()
    expect([...document.querySelectorAll('.moh-chat-dock > .moh-chat-dock-window:not(.moh-chat-dock-inbox)')].map(element => element.id)).toEqual(['moh-chat-dock-slot-b', 'moh-chat-dock-slot-a'])
    dock.open('a'); await settle()
    expect([...document.querySelectorAll('.moh-chat-dock > .moh-chat-dock-window:not(.moh-chat-dock-inbox)')].map(element => element.id)).toEqual(['moh-chat-dock-slot-a', 'moh-chat-dock-slot-b'])
    wrapper.unmount()
  })

  it('retains two independent composers through minimize and moves the same DOM/instance into full chat', async () => {
    const { wrapper, dock } = fixture()
    await settle()
    dock.open('a'); await settle(); dock.open('b'); await settle()
    const a = document.querySelector<HTMLInputElement>('[data-session="a"] input')!
    const b = document.querySelector<HTMLInputElement>('[data-session="b"] input')!
    a.value = 'Draft A with reply'; a.dispatchEvent(new Event('input', { bubbles: true }))
    b.value = 'Draft B'; b.dispatchEvent(new Event('input', { bubbles: true })); await settle()
    dock.setMode('a', 'minimized'); await settle(); dock.open('a'); await settle()
    expect(document.querySelector('[data-session="a"] input')).toBe(a)
    expect(a.value).toBe('Draft A with reply'); expect(b.value).toBe('Draft B')
    context.route.path = '/chat'; context.route.query = { c: 'a' }; await settle()
    const host = document.getElementById('moh-chat-full-thread')!
    dock.fullHostReady.value = true; await settle()
    expect(host.querySelector('input')).toBe(a)
    expect(context.mounts.filter(id => id === 'a')).toHaveLength(1)
    dock.desktop.value = false; dock.width.value = 900; await settle()
    expect(host.querySelector('input')).toBe(a)
    expect(host.querySelector('[data-session="a"]')?.getAttribute('data-visible')).toBe('true')
    expect(host.querySelector('[data-session="a"]')?.getAttribute('data-full-page')).toBe('true')
    expect(context.mounts.filter(id => id === 'a')).toHaveLength(1)
    dock.desktop.value = true; dock.width.value = 1440; await settle()
    context.route.path = '/home'; context.route.query = {}; await settle()
    expect(host.isConnected).toBe(false)
    expect(a.isConnected).toBe(true)
    dock.fullHostReady.value = false; await settle()
    expect(document.querySelector('#moh-chat-dock-slot-a input')).toBe(a)
    expect(a.value).toBe('Draft A with reply')
    expect(b.value).toBe('Draft B')
    wrapper.unmount()
  })

  it('shows each minimized conversation avatar and its own unread badge, without reopening on arrivals', async () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const { wrapper, dock } = fixture()
    await settle()
    dock.open('a'); dock.open('b'); await settle()
    dock.setMode('a', 'minimized'); dock.setMode('b', 'minimized'); await settle()
    const a = document.getElementById('moh-chat-avatar-a')!
    const b = document.getElementById('moh-chat-avatar-b')!
    expect(a.getAttribute('aria-label')).toBe('Restore a, 2 unread messages')
    expect(b.getAttribute('aria-label')).toBe('Restore b, 3 unread messages')
    expect(a.querySelector('[data-avatar-user="a-user"]')).not.toBeNull()
    expect(a.querySelector('[data-presence="true"]')).not.toBeNull()
    expect(a.querySelector('.moh-chat-avatar-badge')?.textContent).toBe('2')
    expect(b.querySelector('.moh-chat-avatar-badge')?.textContent).toBe('3')
    expect(wrapper.find('button[aria-label="Chat"]').find('.moh-chat-avatar-badge').exists()).toBe(false)
    context.messages!.onMessage?.({ message: { id: 'new-in-a', conversationId: 'a', sender: { id: 'a-user' } } as Message })
    await settle()
    expect(dock.sessions.value.find(session => session.key === 'a')?.mode).toBe('minimized')
    context.conversations.value.primary[0]!.unreadCount = 0; await settle()
    expect(a.querySelector('.moh-chat-avatar-badge')).toBeNull()
    expect(b.querySelector('.moh-chat-avatar-badge')?.textContent).toBe('3')
    wrapper.unmount()
  })

  it('opens an accepted incoming conversation in a free slot without moving composer focus', async () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const { wrapper, dock } = fixture()
    await settle()
    dock.open('a'); await settle()
    const composer = document.querySelector<HTMLInputElement>('[data-session="a"] input')!
    composer.focus(); await settle()
    expect(dock.focusedKey.value).toBe('a')
    context.messages!.onMessage?.({ message: { id: 'new-in-b', conversationId: 'b', sender: { id: 'b-user' } } as Message })
    await settle()
    expect(dock.sessions.value.find(session => session.key === 'b')?.mode).toBe('expanded')
    expect(dock.focusedKey.value).toBe('a')
    expect(document.activeElement).toBe(composer)
    wrapper.unmount()
  })

  it('keeps a full-page crew thread out of the personal avatar rail after route departure', async () => {
    const { wrapper, dock } = fixture()
    context.conversations.value.primary.push({ id: 'crew', type: 'crew_wall', viewerStatus: 'accepted', isMuted: false, unreadCount: 4, participants: [] } as unknown as MessageConversation)
    context.route.path = '/chat'; context.route.query = { c: 'crew' }; await settle()
    dock.fullHostReady.value = true; await settle()
    expect(document.querySelector('#moh-chat-full-thread [data-session="crew"]')).not.toBeNull()
    expect(dock.sessions.value.find(session => session.key === 'crew')?.dockable).toBe(false)
    context.route.path = '/home'; context.route.query = {}; dock.fullHostReady.value = false; await settle()
    expect(document.getElementById('moh-chat-avatar-crew')).toBeNull()
    expect(document.querySelector('[data-session="crew"]')).toBeNull()
    wrapper.unmount()
  })
  it('opens picker search results and recipient drafts on the current page, then explicitly expands the same draft', async () => {
    const { wrapper, dock } = fixture(); await settle()
    const inbox = wrapper.findAllComponents(Workspace).find(component => component.props('listOnly'))!
    inbox.vm.$emit('select', 'a', 'target'); await settle()
    const selected = wrapper.findAllComponents(Workspace).find(component => component.props('conversationId') === 'a')!
    expect(selected.props('jumpMessageId')).toBe('target')
    expect(context.navigation).not.toHaveBeenCalled()
    expect(context.route.path).toBe('/home')
    const recipients = [{ id: 'recipient-a', name: 'A' }, { id: 'recipient-b', name: 'B' }] as FollowListUser[]
    inbox.vm.$emit('draft', recipients); await settle()
    const draft = dock.sessions.value.find(session => session.draftRecipients)!
    expect(draft.conversationId).toBeNull()
    expect(draft.draftRecipients?.map(recipient => recipient.id)).toEqual(['recipient-a', 'recipient-b'])
    const composer = document.querySelector<HTMLInputElement>(`#moh-chat-dock-slot-${draft.key} input`)!
    composer.value = 'Group draft'; composer.dispatchEvent(new Event('input', { bubbles: true })); await settle()
    expect(context.navigation).not.toHaveBeenCalled()
    context.route.path = '/chat'; context.route.query = { dock: draft.key }; await settle()
    dock.fullHostReady.value = true; await settle()
    expect(document.querySelector('#moh-chat-full-thread input')).toBe(composer)
    expect(composer.value).toBe('Group draft')
    wrapper.unmount()
  })
})
