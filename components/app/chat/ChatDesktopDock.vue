<template>
  <!-- Personal conversations only. Keyed workspaces stay mounted through minimize, overflow and full-page handoff. -->
  <div v-show="desktop && user?.id && !isPageAccount && !pageOwnsChat" class="moh-chat-dock" :style="dockStyle" aria-label="Chat dock">
    <div
v-for="session in sessions" v-show="visibleKeys.has(session.key) && session.dockable !== false && session.mode === 'expanded' && !isFull(session)" :id="slotId(session.key)"
      :key="`slot:${session.key}`"
      class="moh-chat-dock-window moh-surface-2 moh-border" :class="{ 'is-marv': session.marv }"
      style="width: 380px"/>
    <div v-show="listExpanded" class="moh-chat-dock-window moh-chat-dock-inbox moh-surface-2 moh-border" :class="{ 'is-minimized': !listExpanded }" :style="{ width: listExpanded ? '320px' : '180px' }">
      <div class="flex h-12 shrink-0 items-center">
        <button type="button" class="h-full flex-1 px-3 text-left text-sm font-semibold" :aria-expanded="listExpanded" aria-controls="moh-chat-dock-list" @click="toggleList"><Icon name="tabler:messages" class="mr-2" /> Chat</button>
        <div class="relative">
          <button type="button" class="moh-dock-icon" :aria-expanded="overflowOpen" aria-label="Chat options" @click="overflowOpen = !overflowOpen"><Icon :name="popupsPaused ? 'tabler:bell-off' : 'tabler:dots'" /><span v-if="overflowSessions.length" class="ml-1 text-xs">{{ overflowSessions.length }}</span></button>
          <div v-if="overflowOpen" class="absolute bottom-12 right-0 w-56 rounded-xl border moh-border moh-surface-2 p-1 shadow-lg" role="menu" aria-label="Chat options">
            <button type="button" class="flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm" role="menuitemcheckbox" :aria-checked="popupsPaused" @click="popupsPaused = !popupsPaused"><Icon :name="popupsPaused ? 'tabler:bell-off' : 'tabler:bell'" /> {{ popupsPaused ? 'Resume chat popups' : 'Pause chat popups' }}</button>
            <button v-for="session in overflowSessions" :key="session.key" type="button" class="flex min-h-11 w-full items-center px-3 text-left text-sm" role="menuitem" @click="activateOverflow(session.key)">{{ session.title }}</button>
          </div>
        </div>
        <NuxtLink to="/chat" class="moh-dock-icon" aria-label="Open full chat"><Icon name="tabler:arrows-maximize" /></NuxtLink>
      </div>
      <div v-show="listExpanded && !fullHostReady" id="moh-chat-dock-list" class="min-h-0 flex-1 overflow-hidden" />
    </div>

    <div class="moh-chat-avatar-rail" aria-label="Minimized chats">
      <TransitionGroup name="dock-avatar" tag="div" class="moh-chat-avatar-stack">
        <div v-for="session in railSessions" :key="session.key" :ref="bindAvatarPresence(session)" class="moh-chat-avatar-item">
          <button :id="avatarId(session.key)" type="button" class="moh-chat-avatar moh-surface-2" :class="{ 'is-marv': session.marv }" :aria-label="avatarLabel(session)" :title="avatarLabel(session)" @click="open(session.key)">
            <AppMarvMark v-if="session.marv" :size="28" />
            <AppUserAvatar v-else-if="directUser(session)" :user="directUser(session)" size-class="h-14 w-14" :enable-preview="false" :show-status="false" :show-presence="!session.marv" />
            <Icon v-else :name="session.marv ? 'tabler:sparkles' : 'tabler:users'" class="text-2xl" />
            <span v-if="conversationUnread(session)" :key="conversationUnread(session)" class="moh-chat-avatar-badge" aria-hidden="true">{{ badgeCount(conversationUnread(session)) }}</span>
          </button>
          <button v-if="!session.marv" type="button" class="moh-chat-avatar-close" :aria-label="`Close ${session.title}`" @click="setMode(session.key, 'closed')"><Icon name="tabler:x" /></button>
        </div>
      </TransitionGroup>
      <button v-if="canOpenMarv && (!marvSession || marvSession.mode === 'closed')" type="button" class="moh-chat-avatar moh-surface-2 is-marv" aria-label="Open MARV" title="MARV" @click="openMarv"><AppMarvMark :size="28" /></button>
      <button type="button" class="moh-chat-avatar moh-surface-2" :aria-expanded="listExpanded" aria-controls="moh-chat-dock-list" aria-label="Chat" title="Chats" @click="toggleList"><Icon :name="listExpanded ? 'tabler:x' : 'tabler:messages'" class="text-2xl" /></button>
    </div>
  </div>

  <Teleport v-if="inboxMounted" :to="fullHostReady ? '#moh-chat-full-list' : '#moh-chat-dock-list'">
    <ChatWorkspace ref="inboxRef" embedded list-only :full-page="fullHostReady" :visible="desktop && (listExpanded || fullHostReady)" :focused="false" @select="openConversation" @draft="openDraftChat" />
  </Teleport>
  <template v-for="session in sessions" :key="session.key">
    <Teleport v-if="session.mode !== 'closed' && (session.dockable !== false || isFull(session))" :to="isFull(session) ? '#moh-chat-full-thread' : `#${slotId(session.key)}`">
      <div
v-show="isFull(session) || (visibleKeys.has(session.key) && session.mode === 'expanded')" class="flex h-full min-h-0 flex-col" :data-chat-session-key="session.key"
        @focusin="focusedKey = session.key" @pointerdown="focusedKey = session.key" @keydown.esc="onEscape($event, session)">
        <ChatWorkspace
:conversation-id="session.conversationId" :open-marv="session.marv && !session.conversationId" embedded
          :initial-recipients="session.draftRecipients"
          :full-page="isFull(session)"
          :visible="isFull(session) || (desktop && !pageOwnsChat && visibleKeys.has(session.key) && session.mode === 'expanded')"
          :focused="focusedKey === session.key" :jump-message-id="isFull(session) && typeof route.query.m === 'string' ? route.query.m : session.jumpMessageId ?? null" @state="state => updateSession(session.key, state)">
          <template #controls>
            <div class="flex shrink-0 items-center">
              <NuxtLink :to="session.conversationId ? { path: '/chat', query: { c: session.conversationId } } : { path: '/chat', query: { dock: session.key } }" class="moh-dock-icon" :aria-label="`Open ${session.title} in full chat`"><Icon name="tabler:arrows-maximize" /></NuxtLink>
              <button v-if="!isFull(session)" type="button" class="moh-dock-icon" :aria-label="`Minimize ${session.title}`" @click="setMode(session.key, 'minimized')"><Icon name="tabler:minus" /></button>
              <button v-if="!session.marv" type="button" class="moh-dock-icon" :aria-label="`Close ${session.title}`" @click="closeSession(session)"><Icon name="tabler:x" /></button>
            </div>
          </template>
        </ChatWorkspace>
      </div>
    </Teleport>
  </template>
</template>

<script setup lang="ts">
import ChatWorkspace from './ChatWorkspace.vue'
import { useDesktopChatDock } from '~/composables/chat/useDesktopChatDock'
import { useCallSession } from '~/composables/calls/useCallSession'
import { useChatScreenPresence } from '~/composables/chat/useChatScreenPresence'
import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'
import { canAutoOpenConversation, type DockSession } from '~/utils/chat-dock'
import { useChatDockSounds } from '~/composables/chat/useChatDockSounds'
import { useRefcountedInterest } from '~/composables/chat/useRefcountedInterest'
import { useViewportIdsObserver } from '~/composables/chat/useViewportIdsObserver'
import { animateChatDock } from '~/utils/chat-dock-motion'
import type { FollowListUser, Message } from '~/types/api'

const { width, desktop, capacity, sessions, listExpanded, popupsPaused, fullHostReady, focusedKey, open: openSession, openDraft, setMode: updateMode, reset } = useDesktopChatDock()
const { user, isPageAccount } = useAuth()
const route = useRoute()
const { emitMessagesScreen, isSocketConnected, addInterest, removeInterest } = usePresence()
const sounds = useChatDockSounds()
const motionCleanups = new Set<() => void>()
const publishViewing = useChatScreenPresence(emitMessagesScreen)
const inboxRef = ref<InstanceType<typeof ChatWorkspace> | null>(null)
const inboxMounted = ref(false)
const overflowOpen = ref(false)
const fullConversationId = computed(() => route.path !== '/chat' ? null : typeof route.query.c === 'string' ? route.query.c : typeof route.query.dock === 'string' && sessions.value.some(session => session.key === route.query.dock && session.mode !== 'closed') ? route.query.dock : null)
const pageOwnsChat = computed(() => route.path === '/chat' && !fullConversationId.value)
const canOpenMarv = computed(() => inboxRef.value?.chat.marv?.isAvailable.value === true)
const marvSession = computed(() => sessions.value.find(session => session.marv))
const visibleKeys = computed(() => {
  const live = sessions.value.filter(session => session.dockable !== false && session.mode === 'expanded' && !isFull(session))
  let available = width.value - 128 - (listExpanded.value ? 336 : 0)
  let slots = capacity.value
  const visible = new Set<string>()
  for (const session of [...live].reverse()) {
    if (slots <= 0 || available < 380) continue
    available -= 396
    slots--
    visible.add(session.key)
  }
  return visible
})
const railSessions = computed(() => sessions.value.filter(session => session.dockable !== false && session.mode !== 'closed' && !isFull(session) && !visibleKeys.value.has(session.key)))
const avatarUserIds = new Map<string, string>()
const visibleAvatarKeys = new Set<string>()
const avatarInterest = useRefcountedInterest({ add: ids => addInterest(ids), remove: ids => removeInterest(ids) })
const avatarObserver = useViewportIdsObserver({ onVisible: (key, visible) => {
  if (visibleAvatarKeys.has(key) === visible) return
  if (visible) visibleAvatarKeys.add(key)
  else visibleAvatarKeys.delete(key)
  const id = avatarUserIds.get(key)
  if (id) avatarInterest.setVisible(id, visible)
} })
function bindAvatarPresence(session: DockSession) {
  const id = !session.marv ? directUser(session)?.id : null
  const previous = avatarUserIds.get(session.key)
  if (previous !== id) {
    if (visibleAvatarKeys.has(session.key)) {
      if (previous) avatarInterest.setVisible(previous, false)
      if (id) avatarInterest.setVisible(id, true)
    }
    if (id) avatarUserIds.set(session.key, id)
    else avatarUserIds.delete(session.key)
  }
  return avatarObserver.bindRow(session.key)
}
const badgeCount = (count: number) => count > 99 ? '99+' : String(count)
function conversation(session: DockSession) { return inboxRef.value?.chat.conversations.value.primary.find(c => c.id === session.conversationId) }
function directUser(session: DockSession) {
  const c = conversation(session)
  return c?.type === 'direct' ? inboxRef.value?.chat.getDirectUser(c) : session.draftRecipients?.length === 1 ? session.draftRecipients[0] : null
}
function conversationUnread(session: DockSession) { return Math.max(0, conversation(session)?.unreadCount ?? 0) }
function avatarLabel(session: DockSession) {
  const unread = conversationUnread(session)
  return `Restore ${session.title}${unread ? `, ${unread} unread ${unread === 1 ? 'message' : 'messages'}` : ''}`
}
const overflowSessions = computed(() => sessions.value.filter(session => session.dockable !== false && session.mode !== 'closed' && !visibleKeys.value.has(session.key) && !isFull(session)))
const { selectedSpaceId, currentSpace } = useSpaceLobby()
const radioHasStation = computed(() => Boolean(selectedSpaceId.value && currentSpace.value))
const { call, incoming, minimized: callMinimized } = useCallSession()
const dockStyle = computed(() => {
  const bottom = call.value && callMinimized.value ? '112px' : radioHasStation.value ? 'calc(24px + var(--moh-radio-bar-height, 4rem))' : '24px'
  return { bottom, '--dock-bottom': bottom }
})

function avatarId(key: string) { return `moh-chat-avatar-${key}` }
function animateBetween(from: DOMRect | undefined, targetId: string, restoring: boolean) {
  void nextTick(() => {
    const target = document.getElementById(targetId)
    if (!from || !target || !desktop.value) return
    const cleanup = animateChatDock(from, target, restoring, () => cleanup && motionCleanups.delete(cleanup))
    if (cleanup) motionCleanups.add(cleanup)
  })
}
function cancelMotion() {
  for (const cleanup of [...motionCleanups]) cleanup()
  motionCleanups.clear()
}
function open(key: string, automatic = false) {
  cancelMotion()
  const existing = sessions.value.find(session => session.key === key || session.conversationId === key)
  const from = document.getElementById(avatarId(existing?.key ?? key))?.getBoundingClientRect()
  if (!automatic && capacity.value === 1) listExpanded.value = false
  openSession(key, automatic)
  const opened = sessions.value.find(session => session.key === key || session.conversationId === key)
  if (opened && key === inboxRef.value?.chat.marvConversationId.value) opened.marv = true
  if (!automatic) {
    sounds.open()
    animateBetween(from, slotId(existing?.key ?? key), true)
    if (from) void nextTick(() => document.getElementById(slotId(existing?.key ?? key))?.querySelector<HTMLElement>('[role="textbox"]')?.focus({ preventScroll: true }))
  }
}
function setMode(key: string, mode: DockSession['mode']) {
  cancelMotion()
  const slot = document.getElementById(slotId(key))
  const heldFocus = slot?.contains(document.activeElement)
  const from = slot?.getBoundingClientRect()
  updateMode(key, mode)
  if (mode === 'minimized') {
    sounds.minimize()
    animateBetween(from, avatarId(key), false)
    if (heldFocus) void nextTick(() => document.getElementById(avatarId(key))?.focus({ preventScroll: true }))
  } else if (mode === 'closed') sounds.close()
}
function onEscape(event: KeyboardEvent, session: DockSession) {
  if (event.defaultPrevented || isFull(session) || (event.target instanceof Element && event.target.closest('[role="dialog"], [role="menu"], [role="listbox"]'))) return
  event.preventDefault()
  event.stopPropagation()
  setMode(session.key, 'minimized')
}
function toggleList() {
  listExpanded.value = !listExpanded.value
  if (listExpanded.value) sounds.open()
  else sounds.minimize()
}
function slotId(key: string) { return `moh-chat-dock-slot-${key}` }
function isFull(session: DockSession) { return Boolean(fullHostReady.value && fullConversationId.value && (session.conversationId === fullConversationId.value || session.key === fullConversationId.value)) }
function openConversation(id: string, jumpMessageId?: string) {
  if (id === 'marv') { openMarv(); return }
  if (route.path === '/chat' && fullHostReady.value) void navigateTo({ path: '/chat', query: { c: id, ...(jumpMessageId ? { m: jumpMessageId } : {}) } })
  else {
    open(id)
    if (jumpMessageId) sessions.value = sessions.value.map(session => session.conversationId === id ? { ...session, jumpMessageId } : session)
  }
}
function openDraftChat(recipients: FollowListUser[]) {
  if (!recipients.length) return
  if (recipients.length === 1 && recipients[0]?.id === inboxRef.value?.chat.marv.marvUserId.value) { openMarv(); return }
  if (capacity.value === 1) listExpanded.value = false
  const key = openDraft(recipients)
  sounds.open()
  if (route.path === '/chat' && fullHostReady.value) void navigateTo({ path: '/chat', query: { dock: key } })
}
function openMarv() {
  const existing = inboxRef.value?.chat.marvConversationId.value
  if (existing) {
    open(existing)
    const session = sessions.value.find(session => session.conversationId === existing)
    if (session) session.marv = true
    if (route.path === '/chat' && fullHostReady.value) void navigateTo({ path: '/chat', query: { c: existing } })
  } else {
    open('marv')
    if (route.path === '/chat' && fullHostReady.value) void navigateTo({ path: '/chat', query: { dock: 'marv' } })
  }
}
function activateOverflow(key: string) { overflowOpen.value = false; open(key) }
function closeSession(session: DockSession) {
  setMode(session.key, 'closed')
  if (isFull(session)) void navigateTo('/chat')
}
function updateSession(key: string, state: { conversationId: string | null; atBottom: boolean; title: string; dockable?: boolean; marv?: boolean }) {
  const current = sessions.value.find(session => session.key === key)
  if (!current || (current.conversationId === state.conversationId && current.atBottom === state.atBottom && current.title === state.title && current.dockable === state.dockable && current.marv === state.marv)) return
  sessions.value = sessions.value.map(session => session.key === key ? { ...session, ...state } : session)
}

// At most one focused conversation publishes viewing state, and only at the bottom.
watchEffect(() => {
  if (pageOwnsChat.value) { publishViewing(false); return }
  const session = sessions.value.find(session => session.key === focusedKey.value)
  const viewing = session && session.atBottom && (isFull(session) || (desktop.value && visibleKeys.value.has(session.key) && session.mode === 'expanded'))
  publishViewing(Boolean(viewing), viewing ? session!.conversationId : null)
})
watch([fullConversationId, desktop], ([id, enabled]) => {
  if (id && enabled) open(id)
}, { immediate: true })

let identityGeneration = 0
const seenMessages = new Set<string>()
function allowPopups() { return desktop.value && !popupsPaused.value && !pageOwnsChat.value && !(capacity.value === 1 && listExpanded.value) && !call.value && !incoming.value && document.visibilityState === 'visible' && document.hasFocus() }
async function onArrival(message: Message) {
  if (!allowPopups() || !desktop.value || popupsPaused.value || (capacity.value === 1 && listExpanded.value) || pageOwnsChat.value || !user.value?.id || isPageAccount.value || document.visibilityState !== 'visible' || !document.hasFocus()) return
  if (seenMessages.has(message.id)) return
  seenMessages.add(message.id)
  if (seenMessages.size > 200) seenMessages.delete(seenMessages.values().next().value!)
  const generation = identityGeneration
  const viewerId = user.value.id
  const inbox = inboxRef.value?.chat
  if (!inbox) return
  let conversation = inbox.conversations.value.primary.find(conversation => conversation.id === message.conversationId)
  if (!conversation) {
    await inbox.conversationsApi.refreshAllConversationTabs().catch(() => undefined)
    if (generation !== identityGeneration || viewerId !== user.value?.id) return
    conversation = inbox.conversations.value.primary.find(conversation => conversation.id === message.conversationId)
  }
  if (!canAutoOpenConversation(conversation, message.sender.id, viewerId, allowPopups())) return
  open(message.conversationId, true)
}
usePresenceCallback('Messages', { onMessage: payload => { if (payload.message) void onArrival(payload.message as Message) } })
function refreshVisible() {
  if (!desktop.value || !user.value?.id || document.visibilityState !== 'visible') return
  void inboxRef.value?.chat.conversationsApi.refreshAllConversationTabs().catch(() => undefined)
}
watch(isSocketConnected, connected => { if (connected) refreshVisible() })
watch(() => user.value?.id, () => {
  identityGeneration++
  seenMessages.clear()
  reset()
  inboxMounted.value = false
  void nextTick(() => { inboxMounted.value = Boolean(desktop.value && user.value?.id && !isPageAccount.value) })
})
watch(desktop, enabled => { if (enabled && user.value?.id && !isPageAccount.value) inboxMounted.value = true })
function clearFocusOutside(event: Event) {
  const target = event.target
  if (target instanceof Element && !target.closest('[data-chat-session-key]')) focusedKey.value = null
}
function measure() { width.value = window.innerWidth }
onMounted(async () => {
  measure()
  window.addEventListener('resize', measure)
  document.addEventListener('pointerdown', clearFocusOutside)
  document.addEventListener('focusin', clearFocusOutside)
  window.addEventListener('focus', refreshVisible)
  document.addEventListener('visibilitychange', refreshVisible)
  await nextTick()
  inboxMounted.value = Boolean(desktop.value && user.value?.id && !isPageAccount.value)
})
onBeforeUnmount(() => {
  identityGeneration++
  for (const cleanup of motionCleanups) cleanup()
  motionCleanups.clear()
  window.removeEventListener('resize', measure)
  document.removeEventListener('pointerdown', clearFocusOutside)
  document.removeEventListener('focusin', clearFocusOutside)
  window.removeEventListener('focus', refreshVisible)
  document.removeEventListener('visibilitychange', refreshVisible)
  reset()
})
</script>

<style scoped>
.moh-chat-dock { position: fixed; right: 104px; z-index: 45; display: flex; align-items: flex-end; gap: 16px; pointer-events: none; }
.moh-chat-dock-window { position: relative; height: min(620px, calc(100dvh - var(--dock-bottom, 24px) - 72px)); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--moh-border); border-radius: 12px; box-shadow: 0 8px 24px rgb(0 0 0 / 35%); pointer-events: auto; transform-origin: bottom right; transition: width 320ms cubic-bezier(.2,.8,.2,1), height 320ms cubic-bezier(.2,.8,.2,1); animation: dock-reveal 200ms ease-out; }
.moh-chat-dock-window.is-minimized { height: 48px; }
.moh-chat-dock-window > .flex.h-full { position: absolute; inset: 0; }
.moh-chat-dock-tab { width: 180px; border: 1px solid var(--moh-border); border-radius: 12px; pointer-events: auto; box-shadow: 0 8px 24px rgb(0 0 0 / 35%); }
.moh-chat-dock-window.is-marv { border-color: color-mix(in srgb, var(--moh-premium) 48%, var(--moh-border)); }
.moh-chat-dock-window.is-marv :deep(.moh-chat-dock-header) { background: linear-gradient(115deg, color-mix(in srgb, var(--moh-premium) 13%, transparent), transparent 85%); }
.moh-chat-avatar.is-marv { border: 2px solid color-mix(in srgb, var(--moh-premium) 72%, var(--moh-border)); background: radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--moh-premium) 15%, var(--moh-surface-2)), var(--moh-surface-2) 75%); }
.moh-chat-dock-inbox { overflow: visible; }
.moh-dock-icon { display: inline-flex; align-items: center; justify-content: center; width: 44px; min-width: 44px; height: 44px; border-radius: 8px; }
.moh-dock-icon:hover { background: var(--moh-surface-hover); }
.moh-chat-avatar-rail { position: absolute; right: -80px; bottom: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; pointer-events: auto; }
.moh-chat-avatar-stack { display: flex; flex-direction: column; gap: 12px; max-height: calc(100dvh - var(--dock-bottom, 24px) - 216px); overflow-y: auto; overflow-x: clip; padding: 18px 18px 8px 32px; margin: -18px -18px -8px -32px; scrollbar-width: thin; }
.moh-chat-avatar-item { position: relative; width: 56px; height: 56px; flex-shrink: 0; }
.moh-chat-avatar { position: relative; display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; flex-shrink: 0; border: 1px solid var(--moh-border); border-radius: 50%; box-shadow: 0 8px 24px rgb(0 0 0 / 25%); transition: transform 180ms cubic-bezier(.2,.8,.2,1), box-shadow 180ms; }
.moh-chat-avatar:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgb(0 0 0 / 35%); }
.moh-chat-avatar:focus-visible { outline: 2px solid var(--moh-text); outline-offset: 4px; }
.moh-chat-avatar-badge { position: absolute; right: -5px; top: -5px; display: flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; padding: 0 5px; border-radius: 12px; background: #c72838; color: white; font-size: 11px; font-weight: 700; box-shadow: 0 0 0 2px var(--moh-surface-2); animation: badge-arrive 220ms ease-out; }
.moh-chat-avatar-close { position: absolute; right: -16px; top: -16px; z-index: 2; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 12px; opacity: 0; pointer-events: none; transition: opacity 120ms, transform 180ms; }
.moh-chat-avatar-close::before { content: ""; position: absolute; inset: 10px; z-index: -1; border: 1px solid var(--moh-border); border-radius: 50%; background: var(--moh-surface-2); box-shadow: 0 2px 6px rgb(0 0 0 / 25%); }
.moh-chat-avatar-close:hover::before { background: var(--moh-surface-hover); }
.moh-chat-avatar-close:focus-visible { outline: 2px solid var(--moh-text); outline-offset: -7px; }
.moh-chat-avatar-item:has(.moh-chat-avatar-close):hover .moh-chat-avatar-badge, .moh-chat-avatar-item:has(.moh-chat-avatar-close):focus-within .moh-chat-avatar-badge { opacity: 0; }
.moh-chat-avatar-item:hover .moh-chat-avatar-close, .moh-chat-avatar-item:focus-within .moh-chat-avatar-close { opacity: 1; pointer-events: auto; }
.dock-avatar-enter-active, .dock-avatar-leave-active, .dock-avatar-move { transition: transform 320ms cubic-bezier(.2,.8,.2,1), opacity 160ms; }
.dock-avatar-enter-from, .dock-avatar-leave-to { opacity: 0; transform: scale(.7); }
/* Keep glass static: only the small surfaces blur, never the moving page beneath them. */
@supports (backdrop-filter: blur(8px)) {
  .moh-chat-dock-window { background: color-mix(in srgb, var(--moh-surface-2) 94%, transparent); backdrop-filter: blur(8px); }
}
@media (prefers-reduced-transparency: reduce) {
  .moh-chat-dock-window { background: var(--moh-surface-2); backdrop-filter: none; }
}
@keyframes badge-arrive { from { opacity: 0; transform: scale(.65); } to { opacity: 1; transform: scale(1); } }
@keyframes dock-reveal { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .moh-chat-dock-window, .moh-chat-avatar, .moh-chat-avatar-badge, .dock-avatar-enter-active, .dock-avatar-leave-active, .dock-avatar-move { transition: none; animation: none; } }
</style>
