<template>
  <section class="flex min-h-0 flex-col">
    <header class="flex min-h-14 shrink-0 items-center gap-2 border-b moh-border px-3">
      <NuxtLink v-if="!rootId" :to="`/groups/${group.slug}/channels`" class="channel-back moh-focus flex size-11 shrink-0 items-center justify-center" aria-label="Channels"><Icon name="tabler:chevron-left" /></NuxtLink>
      <div class="min-w-0 flex-1" :class="rootId ? 'pl-1' : ''">
        <h2 class="flex min-w-0 items-center gap-1.5 truncate font-semibold"><template v-if="rootId">Thread</template><template v-else><AppChannelsChannelIcon :channel="channel" class="shrink-0" /><span class="truncate">{{ channelTitle(channel) }}</span></template></h2>
        <p v-if="rootId && root" class="truncate text-xs moh-text-muted">{{ [root.following ? 'Following' : null, root.replyCount ? `${root.replyCount} ${root.replyCount === 1 ? 'reply' : 'replies'}` : null].filter(Boolean).join(' · ') || `#${channel.name}` }}</p>
        <p v-else-if="channel.topic && !rootId" class="truncate text-xs moh-text-muted">{{ channel.topic }}</p>
        <button v-else-if="!rootId && channel.capabilities.canManage" type="button" class="moh-focus truncate text-xs moh-text-soft hover:underline" @click="manageOpen = true">Add a topic</button>
      </div>
      <template v-if="!rootId"><button type="button" class="moh-focus size-11" aria-label="Pinned messages" @click="openPins"><Icon name="tabler:pin" /></button><button type="button" class="moh-focus size-11" aria-label="Search this group" @click="openSearch"><Icon name="tabler:search" /></button><button type="button" class="moh-focus size-11" aria-label="Channel details and settings" @click="manageOpen = true"><Icon name="tabler:dots-vertical" /></button></template>
      <NuxtLink v-else :to="channelLink(group.slug, channel.id)" class="moh-focus flex size-11 shrink-0 items-center justify-center" aria-label="Close thread"><Icon name="tabler:x" /></NuxtLink>
    </header>
    <p v-if="error" class="p-3 text-sm text-red-600" role="alert">{{ error }} <button type="button" class="underline" @click="load()">Try again</button></p>
    <div class="relative flex min-h-0 flex-1 flex-col">
    <div ref="scroller" class="min-h-0 flex-1 overflow-y-auto overscroll-contain">
     <div>
      <button v-if="state.cursors.value[key]" type="button" class="moh-focus min-h-11 w-full text-sm" :disabled="loading" @click="load(true)">{{ loading && rows.length ? 'Loading earlier messages…' : 'Load earlier messages' }}</button>
      <div v-if="loading && !rows.length" class="p-8" role="status"><AppLogoLoader /></div>
      <div v-if="root" :data-message-id="root.id"><AppChannelsMessageRow :message="root" :permalink="permalink(root)" hide-replies :grouped="false" :can-react="channel.capabilities.canReact" :actions="actions(root)" :reactions="reactions" @react="react(root, $event)" @reply="openThread(root)" @hide-preview="hidePreview(root, $event)" /><div class="border-b moh-border" /></div>
      <TransitionGroup tag="div" :name="loading ? 'channel-static' : 'channel-rows'">
      <div v-for="(message, index) in rows" :key="message.id">
        <div v-if="startsDay(index)" class="flex items-center gap-3 py-5 text-xs moh-text-muted"><span class="h-px flex-1 bg-[var(--moh-border)]" /><time :datetime="message.createdAt">{{ new Date(message.createdAt).toLocaleDateString([], { month: 'long', day: 'numeric' }) }}</time><span class="h-px flex-1 bg-[var(--moh-border)]" /></div>
        <div v-if="message.id === newMarkerId" class="flex items-center gap-3 text-xs text-orange-600"><span class="h-px flex-1 bg-current" />New<span class="h-px flex-1 bg-current" /></div>
        <div :id="`channel-message-${message.id}`" :data-message-id="message.id" :class="targetId === message.id ? 'bg-[var(--moh-surface-2)]' : ''"><AppChannelsMessageRow :message="message" :permalink="permalink(message)" :grouped="grouped(index)" :latest-own="message.id === latestOwnId && !pending.length" :fresh="freshlySent.has(message.id)" :can-react="channel.capabilities.canReact" :actions="actions(message)" :reactions="reactions" @react="react(message, $event)" @reply="openThread(message)" @hide-preview="hidePreview(message, $event)" /></div>
      </div>
      </TransitionGroup>
      <p v-if="!loading && !rows.length" class="p-6 text-sm moh-text-muted">{{ rootId ? 'Start the conversation in this thread.' : `This is the beginning of ${channelTitle(channel)}.` }}</p>
      <AppChannelsMessageRow v-for="(entry, index) in pending" :key="entry.id" :message="pendingMessage(entry)" :grouped="pendingGrouped(index)" :can-react="false" :actions="[]" :reactions="reactions" :status="entry.status === 'failed' ? 'failed' : 'sending'" :latest-own="index === pending.length - 1" hide-replies>
        <template v-if="entry.files?.length || entry.input.giphy" #media><div class="my-2 flex flex-wrap gap-2"><AppChannelsAttachmentTile v-for="(item, tileIndex) in entry.files?.length ? entry.files : [undefined]" :key="tileIndex" :file="item" :image-url="entry.input.giphy?.url" :state="entry.status === 'failed' ? 'failed' : entry.status === 'uploading' ? 'uploading' : 'ready'" /></div></template>
        <template v-if="entry.status === 'failed'" #failed><p class="mt-1 text-sm text-red-600" role="alert">{{ entry.error }}</p><div class="flex gap-3"><button type="button" class="moh-focus min-h-11 text-sm font-semibold" @click="outbox.retry(entry)">Retry</button><button type="button" class="moh-focus min-h-11 text-sm moh-text-muted" @click="outbox.discard(entry.id)">Discard</button></div></template>
      </AppChannelsMessageRow>
     </div>
    </div>
    <button v-if="!atBottom" type="button" class="moh-focus absolute bottom-3 left-1/2 z-10 flex min-h-11 -translate-x-1/2 items-center gap-1.5 rounded-full border moh-border bg-[var(--moh-surface-2)] px-4 text-sm font-semibold shadow-lg" @click="list.onScrollToBottomClick"><Icon name="tabler:arrow-down" aria-hidden="true" />{{ list.pendingNewLabel.value }}</button>
    </div>
    <div class="min-h-6 px-4"><AppTypingIndicator :users="typingNow" verb="typing" size="compact" /></div>
    <AppChannelsComposer v-if="channel.capabilities.canSend" :key="`${key}:${state.accessEpoch.value}`" :group="group" :channel="channel" :root-id="rootId" />
    <p v-else class="border-t moh-border p-4 text-center text-sm moh-text-muted">{{ channel.archivedAt ? 'This channel is archived.' : 'Only group leaders can post here.' }}</p>
    <AppChannelsManagement v-model="manageOpen" :group="group" :channel="channel" @updated="state.load" />
    <AppChannelsSearch v-model="searchOpen" :group="group" :channel="channel" :start-on-pins="startOnPins" />
    <Dialog v-model:visible="editOpen" modal header="Edit message" class="w-full max-w-lg"><form @submit.prevent="commitEdit"><textarea v-model="editText" class="moh-focus min-h-32 w-full rounded-lg border moh-border bg-transparent p-3" maxlength="2000" aria-label="Edit message" /><Button type="submit" label="Save" :disabled="!editText.trim()" /></form></Dialog>
    <Dialog v-model:visible="deleteOpen" modal header="Delete message?" class="w-full max-w-md"><p class="mb-4">This removes the message for everyone. Replies will remain.</p><Button label="Delete for everyone" severity="danger" @click="confirmDelete" /></Dialog>
    <Dialog v-model:visible="reportOpen" modal header="Report message" class="w-full max-w-md"><p class="mb-3 text-sm">A reviewer can see this reported message and its attachments.</p><label class="block text-sm">Reason<textarea v-model="reportText" class="moh-focus mt-2 min-h-24 w-full rounded-lg border moh-border bg-transparent p-3" maxlength="2000" /></label><Button label="Send report" @click="report" /></Dialog>
  </section>
</template>
<script setup lang="ts">
import type { ChannelMessage, CommunityGroupShell, GroupChannel, MessageReaction } from '~/types/api'
import { groupChannelsKey } from '~/composables/channels/useGroupChannels'
import { useChannelOutbox, type ChannelOutboxEntry } from '~/composables/channels/useChannelOutbox'
import { channelArrivals, channelLink, channelPath, channelTitle } from '~/utils/channels/reducer'
import { useBottomAnchoredList } from '~/composables/useBottomAnchoredList'
import type { SurfaceAction } from '~/utils/surface-actions'
import { getSafeUserErrorMessage } from '~/utils/api-error'
const props = defineProps<{ group: CommunityGroupShell; channel: GroupChannel; rootId?: string; targetId?: string }>()
const state = inject(groupChannelsKey)!
const { apiFetchData } = useApiClient()
const presence = usePresence(), router = useRouter()
const outbox = useChannelOutbox()
const channelAnalytics = usePostHog()
const key = computed(() => state.windowKey(props.channel.id, props.rootId))
const path = computed(() => channelPath(props.group.id, props.channel.id))
const typingNow = computed(() => state.typingUsers(props.channel.id, props.rootId ?? null))
const rows = computed(() => state.windows.value[key.value] ?? [])
const root = computed(() => props.rootId ? state.messages.value[props.rootId] ?? null : null)
const reactions = ref<MessageReaction[]>([])
const error = ref<string | null>(null), loading = ref(false)
const startOnPins = ref(false)
function openSearch() { startOnPins.value = false; searchOpen.value = true }
function openPins() { startOnPins.value = true; searchOpen.value = true }
const manageOpen = ref(false), searchOpen = ref(false), editOpen = ref(false), deleteOpen = ref(false), reportOpen = ref(false)
const editText = ref(''), reportText = ref(''), target = ref<ChannelMessage | null>(null)
const scroller = ref<HTMLElement | null>(null)
const { user } = useAuth()
// Pinned while the reader is at the end; reading earlier history is never interrupted, new arrivals are counted instead.
const list = useBottomAnchoredList(scroller)
const atBottom = list.atBottom
// The "New" line marks what was unread when the channel was opened and stays until you leave.
// Messages that arrive while you are here, and your own, never get one.
const entryReadThrough = props.channel.readThrough
const entryHadUnread = props.channel.hasUnread && entryReadThrough > 0
const newMarkerId = computed(() => entryHadUnread ? rows.value.find(message => message.sequence > entryReadThrough && message.sender.id !== user.value?.id)?.id : undefined)
function followLatest() { list.lockToBottom() }
let newestId: string | null = null, opened = false
const pending = computed(() => outbox.entries.value.filter(entry => entry.channelId === props.channel.id && entry.rootId === props.rootId && entry.status !== 'sent'))
const latestOwnId = computed(() => rows.value.findLast(message => message.sender.id === user.value?.id && !message.deletedForAll)?.id)
const freshlySent = ref(new Set<string>())
function pendingMessage(entry: ChannelOutboxEntry): ChannelMessage {
  return { id: `pending:${entry.id}`, body: entry.input.body, createdAt: entry.queuedAt ?? new Date().toISOString(), sender: user.value, media: [], hiddenPreviews: [], reactions: [], deletedForAll: false, replyCount: 0, pinned: false, editedAt: null, receipt: null } as unknown as ChannelMessage
}
function pendingGrouped(index: number) {
  const prior = index > 0 ? pending.value[index - 1] : undefined
  if (prior) return true
  const last = rows.value.at(-1)
  return !!last && last.sender.id === user.value?.id && !last.deletedForAll && Date.now() - new Date(last.createdAt).getTime() < 300_000
}
let observer: IntersectionObserver | undefined, ackTimer: ReturnType<typeof setTimeout> | undefined, lease: ReturnType<typeof setInterval> | undefined, closed = false
const visible = new Set<string>(), acknowledged = new Set<string>()
async function action(work: () => Promise<unknown>) { try { await work(); error.value = null } catch (cause) { error.value = getSafeUserErrorMessage(cause) } }
async function load(older = false) {
  if (loading.value) return
  loading.value = true
  const height = scroller.value?.scrollHeight ?? 0, top = scroller.value?.scrollTop ?? 0
  try {
    await state.history(props.channel.id, props.rootId, older, props.targetId)
    if (props.rootId) {
      const context = await apiFetchData<{ messages: ChannelMessage[] }>(`${path.value}/messages/${props.rootId}/context`)
      if (!closed) context.messages.forEach(state.mergeMessage)
    }
    await nextTick()
    if (closed) return
    if (older && scroller.value) scroller.value.scrollTop = top + scroller.value.scrollHeight - height
    else if (props.targetId) { list.releasePin(); list.atBottom.value = false; document.getElementById(`channel-message-${props.targetId}`)?.scrollIntoView({ block: 'center' }) }
    else if (atBottom.value || !opened) followLatest()
    opened = true
    observe()
    error.value = null
    if (!older) channelAnalytics.capture('channel_opened', { is_thread: !!props.rootId, exact_destination: !!props.targetId })
  } catch (cause) { error.value = getSafeUserErrorMessage(cause, 'Couldn’t load messages.') }
  finally { loading.value = false }
}
function startsDay(index: number) { return index === 0 || rows.value[index]!.createdAt.slice(0, 10) !== rows.value[index - 1]!.createdAt.slice(0, 10) }
function grouped(index: number) { const current = rows.value[index], prior = rows.value[index - 1]; return !!current && !!prior && !startsDay(index) && current.sender.id === prior.sender.id && new Date(current.createdAt).getTime() - new Date(prior.createdAt).getTime() < 300_000 && !prior.deletedForAll }
function permalink(message: ChannelMessage) { return { path: channelLink(props.group.slug, props.channel.id), query: { ...(props.rootId ? { thread: props.rootId } : {}), message: message.id } } }
function openThread(message: ChannelMessage) { void router.push({ path: channelLink(props.group.slug, props.channel.id), query: { thread: message.threadRootId ?? message.id } }) }
function react(message: ChannelMessage, id: string) { void action(() => apiFetchData(`${path.value}/messages/${message.id}/reactions/${id}`, { method: message.reactions?.some(item => item.reactionId === id && item.reactedByMe) ? 'DELETE' : 'PUT', body: {} })) }
function hidePreview(message: ChannelMessage, url: string) { void action(() => apiFetchData(`${path.value}/messages/${message.id}/previews`, { method: 'PUT', body: { url, hidden: true } })) }
function actions(message: ChannelMessage): SurfaceAction[] {
  const rootId = message.threadRootId ?? message.id
  return [
    { id: 'reply', label: 'Reply in thread', icon: 'tabler:message-reply', section: 'conversation', run: () => openThread(message) },
    { id: 'follow', label: message.following ? 'Unfollow thread' : 'Follow thread', icon: 'tabler:bell', section: 'conversation', run: () => action(() => apiFetchData(`${path.value}/threads/${rootId}/follow`, { method: 'PUT', body: { following: !message.following } })) },
    { id: 'unread', label: 'Mark unread', icon: 'tabler:mail', section: 'conversation', run: () => action(() => apiFetchData(`${path.value}/unread`, { method: 'POST', body: { messageId: message.id } })) },
    { id: 'link', label: 'Copy link', icon: 'tabler:link', section: 'copy', run: () => action(() => navigator.clipboard.writeText(new URL(channelLink(props.group.slug, props.channel.id, message), location.origin).href)) },
    { id: 'copy', label: 'Copy message', icon: 'tabler:copy', section: 'copy', available: !message.deletedForAll, run: () => action(() => navigator.clipboard.writeText(message.body)) },
    { id: 'pin', label: message.pinned ? 'Unpin message' : 'Pin message', icon: 'tabler:pin', section: 'organize', available: props.channel.capabilities.canManage && !props.channel.archivedAt && !message.deletedForAll, run: () => action(() => apiFetchData(`${path.value}/messages/${message.id}/pin`, { method: message.pinned ? 'DELETE' : 'PUT', body: {} })) },
    { id: 'edit', label: 'Edit message', icon: 'tabler:pencil', section: 'manage', available: message.canEdit, run: () => { target.value = message; editText.value = message.body; editOpen.value = true } },
    { id: 'report', label: 'Report message', icon: 'tabler:flag', section: 'manage', available: !message.deletedForAll, run: () => { target.value = message; reportOpen.value = true } },
    { id: 'delete', label: 'Delete message', icon: 'tabler:trash', section: 'delete', destructive: true, available: message.canDelete, run: () => { target.value = message; deleteOpen.value = true } },
  ]
}
async function commitEdit() { if (target.value) await action(async () => { await apiFetchData(`${path.value}/messages/${target.value!.id}`, { method: 'PATCH', body: { body: editText.value } }); editOpen.value = false }) }
async function confirmDelete() { if (target.value) await action(async () => { await apiFetchData(`${path.value}/messages/${target.value!.id}`, { method: 'DELETE' }); deleteOpen.value = false }) }
async function report() { if (target.value) await action(async () => { await apiFetchData('/reports', { method: 'POST', body: { targetType: 'message', subjectMessageId: target.value!.id, reason: 'other', details: reportText.value.trim() || null } }); reportOpen.value = false }) }
function observe() { scroller.value?.querySelectorAll('[data-message-id]').forEach(element => observer?.observe(element)) }
async function acknowledge() {
  if (closed || document.visibilityState !== 'visible') return
  const ids = [...visible].filter(id => !acknowledged.has(id))
  if (!ids.length) return
  const viewed = rows.value.filter(message => ids.includes(message.id))
  const through = !props.targetId && viewed.length ? Math.max(...viewed.map(message => message.sequence)) : undefined
  try { await apiFetchData(`${path.value}/read`, { method: 'POST', body: { messageIds: ids, through, threadRootId: props.rootId } }); ids.forEach(id => acknowledged.add(id)) } catch { /* Reconnect retries actual visible content. */ }
}
const viewingClientId = crypto.randomUUID()
function viewing(active: boolean) { return apiFetchData(`${path.value}/viewing`, { method: 'PUT', body: { active, clientId: viewingClientId } }).catch(() => undefined) }
function visibility() { void viewing(document.visibilityState === 'visible'); if (document.visibilityState === 'visible') { void load(); void acknowledge() } }
watch(() => rows.value.map(message => `${message.id}:${message.revision}`).join(','), async () => {
  const { own, others } = channelArrivals(rows.value, newestId, user.value?.id)
  newestId = rows.value.at(-1)?.id ?? null
  await nextTick(); observe()
  if (own) followLatest()
  else if (others) list.onNewItemsAppended({ count: others })
})
watch(() => pending.value.length, async (next, prior) => { if (next > prior) { await nextTick(); followLatest() } })
watch(() => outbox.entries.value.filter(entry => entry.status === 'sent').map(entry => entry.id).join(','), () => {
  for (const entry of outbox.entries.value) {
    if (!entry.message) continue
    state.append(entry.message)
    const id = entry.message.id
    if (entry.channelId !== props.channel.id || freshlySent.value.has(id)) continue
    freshlySent.value = new Set(freshlySent.value).add(id)
    setTimeout(() => { const next = new Set(freshlySent.value); next.delete(id); freshlySent.value = next }, 2500)
  }
})
watch(presence.isSocketConnected, connected => { if (connected) { void load().then(() => channelAnalytics.capture('channel_reconnect_recovered', { success: !error.value })); void acknowledge() } })
watch(() => props.targetId, () => load())
onMounted(async () => {
  if (!props.targetId) followLatest()
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) { const id = (entry.target as HTMLElement).dataset.messageId; if (id) { if (entry.isIntersecting) visible.add(id); else visible.delete(id) } }
    clearTimeout(ackTimer); ackTimer = setTimeout(acknowledge, 350)
  }, { root: scroller.value, threshold: 0.5 })
  document.addEventListener('visibilitychange', visibility)
  void viewing(true); lease = setInterval(() => { if (document.visibilityState === 'visible') void viewing(true) }, 25_000)
  reactions.value = await apiFetchData<MessageReaction[]>('/messages/reactions').catch(() => [])
  await load()
})
onBeforeUnmount(() => { closed = true; observer?.disconnect(); clearTimeout(ackTimer); clearInterval(lease); document.removeEventListener('visibilitychange', visibility); void viewing(false) })
</script>
<style scoped>
.channel-rows-enter-active { transition: opacity 180ms ease-out, transform 180ms ease-out; }
.channel-rows-enter-from { opacity: .4; transform: translateY(6px); }
.channel-rows-leave-active { transition: opacity 150ms ease-in; }
.channel-rows-leave-to { opacity: 0; }
.channel-rows-move { transition: transform 200ms ease-out; }
@media (prefers-reduced-motion: reduce) {
  .channel-rows-enter-active, .channel-rows-leave-active, .channel-rows-move { transition: none; }
}
</style>
