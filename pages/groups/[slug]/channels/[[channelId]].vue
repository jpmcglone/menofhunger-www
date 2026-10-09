<template>
  <div ref="pageEl" class="channel-page flex h-full min-h-0 flex-col">
    <div v-if="error" class="p-5" role="alert"><p>{{ error }}</p><Button label="Try again" text @click="load" /></div>
    <div v-else-if="loading" class="p-8" role="status"><AppLogoLoader /></div>
    <div v-else-if="group?.channelsAvailable" class="channel-workspace flex min-h-0 flex-1" :class="{ 'has-channel': !!channelId, 'has-thread': !!threadId }">
      <nav class="channel-list w-full shrink-0 overflow-y-auto border-r moh-border p-2" aria-label="Channels">
        <button type="button" class="moh-focus flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-sm" @click="openAttention"><span>For you</span><span v-if="state.personalCount.value" class="font-semibold">{{ state.personalCount.value }}</span></button>
        <div class="my-2 border-t moh-border" />
        <div v-for="channel in shownChannels" :key="channel.id" class="group relative" @contextmenu.prevent="openMenu($event, channel)">
          <NuxtLink :to="channelLink(group.slug, channel.id)" class="moh-focus flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm" :class="[channel.id === channelId ? 'bg-[var(--moh-surface-2)]' : 'moh-surface-hover', channel.hasUnread ? 'font-bold' : '', isMuted(channel) || channel.hidden ? 'opacity-60' : '']" :aria-current="channel.id === channelId ? 'page' : undefined">
            <AppChannelsChannelIcon :channel="channel" /><span class="truncate">{{ channelTitle(channel) }}</span><AppChannelsTypingDots v-if="state.typingByChannel.value[channel.id]?.length" class="shrink-0 moh-text-muted" :label="`${state.typingByChannel.value[channel.id]!.map(item => item.username).join(', ')} typing`" /><Icon v-if="isMuted(channel)" name="tabler:bell-off" class="ml-auto shrink-0 moh-text-muted" aria-label="Muted" /><span v-if="channel.personalCount" class="rounded-full bg-[var(--moh-text)] px-2 text-xs text-[var(--moh-bg)]" :class="isMuted(channel) ? '' : 'ml-auto'">{{ channel.personalCount }}</span><span v-else-if="channel.hasUnread" class="ml-auto size-1.5 rounded-full bg-current" aria-label="Unread activity" />
          </NuxtLink>
          <button type="button" class="moh-focus absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg bg-[var(--moh-surface-2)] opacity-0 focus-visible:opacity-100 group-hover:opacity-100" :aria-label="`Options for ${channelTitle(channel)}`" @click.prevent="openMenu($event, channel)"><Icon name="tabler:dots" /></button>
        </div>
        <button v-if="hiddenCount" type="button" class="moh-focus min-h-11 px-3 text-sm moh-text-muted" @click="showHidden = !showHidden">{{ showHidden ? 'Hide hidden channels' : `Hidden channels (${hiddenCount})` }}</button>
        <TieredMenu v-if="menuMounted" ref="menuRef" :model="menuItems" popup />
        <button v-if="leader" type="button" class="moh-focus flex min-h-11 w-full items-center gap-2 px-3 text-sm moh-text-muted" @click="createOpen = true"><Icon name="tabler:plus" />New channel</button>
        <button type="button" class="moh-focus min-h-11 px-3 text-sm moh-text-muted" @click="showArchived = !showArchived">{{ showArchived ? 'Hide archived channels' : 'Archived channels' }}</button>
      </nav>
      <template v-if="selected">
        <AppChannelsTimeline :key="selected.id" class="channel-conversation min-w-0 flex-1" :group="group" :channel="selected" :target-id="threadId ? undefined : messageId" />
        <AppChannelsTimeline v-if="threadId" :key="`${selected.id}:${threadId}`" class="channel-thread min-w-0 flex-1 border-l moh-border" :group="group" :channel="selected" :root-id="threadId" :target-id="messageId" />
      </template>
      <div v-else-if="channelId" class="p-6"><h2 class="font-semibold">Channel unavailable</h2><p class="mt-2 moh-text-muted">Your access may have changed. Your unsent text is saved on this device.</p><NuxtLink :to="`/groups/${group.slug}/channels`" class="moh-focus mt-4 inline-flex min-h-11 items-center">Channels</NuxtLink></div>
    </div>
    <div v-else-if="!loading && group" class="p-6">Channels aren’t available for this group.</div>
    <AppChannelsManagement v-if="group" v-model="createOpen" :group="group" @updated="state.load" />
    <AppChannelsManagement v-if="group && menuChannel" v-model="manageOpen" :group="group" :channel="menuChannel" @updated="state.load" />
    <Dialog v-model:visible="attentionOpen" modal header="For you" class="w-full max-w-xl">
      <p v-if="!state.attention.value.length" class="moh-text-muted">You’re caught up.</p>
      <div class="moh-divide">
        <NuxtLink v-for="item in state.attention.value" :key="item.messageId" :to="channelLink(group!.slug, item.channelId, item.message)" class="moh-focus block min-h-11 py-3" @click="attentionOpen = false; channelAnalytics.capture('channel_attention_opened')"><strong>{{ item.mentioned ? 'Mentioned you' : 'Replied in a thread' }}</strong><p class="mt-1 line-clamp-3 text-sm">{{ channelReferencePlainText(item.message.body, visibleChannelReferences(item.message.body, { groupId: group?.id ?? '', channels: state.channels.value })) || 'Attachment' }}</p></NuxtLink>
      </div>
    </Dialog>
  </div>
</template>
<script setup lang="ts">
import { channelReferencePlainText, visibleChannelReferences } from '~/utils/channels/references'
import type { MenuItem } from 'primevue/menuitem'
import type { CommunityGroupShell, GroupChannel } from '~/types/api'
import { useAutoToggleMenu } from '~/composables/useAutoToggleMenu'
import { useGroupChannels, groupChannelsKey } from '~/composables/channels/useGroupChannels'
import { isGroupRoute } from '~/utils/group-header'
import { channelLink, channelTitle } from '~/utils/channels/reducer'
import { getSafeUserErrorMessage } from '~/utils/api-error'
// Keep the page (and its channel list) mounted while the channel param changes.
definePageMeta({ layout: 'app', title: 'Channels', key: route => `group-channels:${String(route.params.slug)}` })
const channelAnalytics = usePostHog()
const route = useRoute()
const { apiFetchData } = useApiClient()
// Server-rendered share metadata. Channel and message links preview the public group, never chat content.
const { data: seoShell } = await useAsyncData<CommunityGroupShell | null>(
  () => `group-seo-${String(route.params.slug)}`,
  () => apiFetchData<CommunityGroupShell>(`/groups/by-slug/${encodeURIComponent(String(route.params.slug))}`).catch(() => null),
)
const seo = computed(() => groupSeo(seoShell.value))
usePageSeo({
  title: computed(() => seo.value?.title ?? 'Channels'),
  description: computed(() => seo.value?.description),
  image: computed(() => seo.value?.image),
  imageAlt: computed(() => seo.value?.imageAlt),
  imageWidth: computed(() => seo.value?.imageWidth),
  imageHeight: computed(() => seo.value?.imageHeight),
  twitterCard: computed(() => seo.value?.twitterCard),
  canonicalPath: computed(() => seo.value?.canonicalPath),
  ogType: 'website',
  noindex: true,
  jsonLdGraph: computed(() => seo.value?.jsonLdGraph),
})
const group = ref<CommunityGroupShell | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const showArchived = ref(false)
const createOpen = ref(false)
const attentionOpen = ref(false)
const state = useGroupChannels(group)
provide(groupChannelsKey, state)
const channelId = computed(() => typeof route.params.channelId === 'string' ? route.params.channelId : '')
const threadId = computed(() => typeof route.query.thread === 'string' ? route.query.thread : undefined)
const messageId = computed(() => typeof route.query.message === 'string' ? route.query.message : undefined)
const selected = computed(() => state.channels.value.find(channel => channel.id === channelId.value))
const showHidden = ref(false)
const manageOpen = ref(false)
const menuChannel = ref<GroupChannel | null>(null)
const { mounted: menuMounted, menuRef, toggle: toggleMenu } = useAutoToggleMenu()
const toast = useAppToast()
const { copyText } = useCopyToClipboard()
const isMuted = (channel: GroupChannel) => !!channel.mutedUntil && new Date(channel.mutedUntil) > new Date()
const hiddenCount = computed(() => state.channels.value.filter(channel => channel.hidden && !channel.archivedAt).length)
const shownChannels = computed(() => state.channels.value.filter(channel => (showArchived.value || !channel.archivedAt) && (!channel.hidden || showHidden.value || channel.id === channelId.value)))
const channelPathFor = (channel: GroupChannel) => `/groups/${group.value!.id}/channels/${channel.id}`
async function act(channel: GroupChannel, request: () => Promise<unknown>) {
  try { await request(); await state.load() } catch (cause) { toast.pushError(cause, 'Couldn’t update the channel.') }
}
const muteFor = (channel: GroupChannel, ms: number | null) => act(channel, () => apiFetchData(`${channelPathFor(channel)}/mute`, { method: 'PUT', body: { until: ms === null ? 'forever' : new Date(Date.now() + ms).toISOString() } }))
const menuItems = computed<MenuItem[]>(() => {
  const channel = menuChannel.value
  if (!channel || !group.value) return []
  const minutes = (n: number) => n * 60_000
  const muted = isMuted(channel)
  const prefs = [['all', 'All messages'], ['mentions', 'Mentions & replies'], ['off', 'Nothing']] as const
  return [
    { label: 'Mark as read', icon: 'pi pi-check', disabled: !channel.hasUnread && !channel.personalCount, command: () => act(channel, () => apiFetchData(`${channelPathFor(channel)}/read-all`, { method: 'POST' })) },
    ...(channel.privacy === 'private' && channel.capabilities.canInvite ? [{ label: 'Invite to channel', icon: 'pi pi-user-plus', command: () => { manageOpen.value = true } }] : []),
    { label: 'Copy link', icon: 'pi pi-link', command: async () => { await copyText(`${window.location.origin}${channelLink(group.value!.slug, channel.id)}`); toast.push({ title: 'Link copied', tone: 'success' }) } },
    { separator: true },
    muted
      ? { label: 'Unmute channel', icon: 'pi pi-bell', command: () => act(channel, () => apiFetchData(`${channelPathFor(channel)}/mute`, { method: 'PUT', body: { until: null } })) }
      : { label: 'Mute channel', icon: 'pi pi-bell-slash', items: [
        { label: 'For 15 minutes', command: () => muteFor(channel, minutes(15)) },
        { label: 'For 1 hour', command: () => muteFor(channel, minutes(60)) },
        { label: 'For 8 hours', command: () => muteFor(channel, minutes(480)) },
        { label: 'For 24 hours', command: () => muteFor(channel, minutes(1440)) },
        { label: 'Until I turn it back on', command: () => muteFor(channel, null) },
      ] },
    { label: 'Notification settings', icon: 'pi pi-cog', items: prefs.map(([value, label]) => ({ label, icon: channel.preference === value ? 'pi pi-check' : 'pi pi-minus', command: () => act(channel, () => apiFetchData(`${channelPathFor(channel)}/preference`, { method: 'PUT', body: { preference: value } })) })) },
    { separator: true },
    { label: channel.hidden ? 'Show channel' : 'Hide channel', icon: channel.hidden ? 'pi pi-eye' : 'pi pi-eye-slash', command: () => act(channel, () => apiFetchData(`${channelPathFor(channel)}/hidden`, { method: 'PUT', body: { hidden: !channel.hidden } })) },
  ]
})
function openMenu(event: Event, channel: GroupChannel) { menuChannel.value = channel; void toggleMenu(event) }
const leader = computed(() => ['owner', 'moderator'].includes(group.value?.viewerMembership?.role ?? ''))
const context = usePageGroupContext()
const groupTabs = useGroupTabs()
const channelBadges = useGroupChannelBadges()
watch(state.channels, list => { if (group.value && !state.loading.value) channelBadges.set(group.value.id, list) }, { deep: true })
watch([group, () => state.personalCount.value], ([next, personalCount]) => { if (next) groupTabs.value = { group: next, personalCount } })
const { header: appHeader } = useAppHeader()
const pageEl = ref<HTMLElement | null>(null)
const lastChannelKey = computed(() => group.value ? `moh-last-channel:${group.value.id}` : '')
const rememberedChannel = () => lastChannelKey.value && import.meta.client ? localStorage.getItem(lastChannelKey.value) : null
// Wide layouts always show a conversation: the last one you were in, else the first with news, else the first.
function openDefaultChannel() {
  if (channelId.value || !group.value || !pageEl.value || pageEl.value.clientWidth < 640) return
  const open = state.channels.value.filter(channel => !channel.archivedAt)
  const target = open.find(channel => channel.id === rememberedChannel()) ?? open.find(channel => channel.personalCount || channel.hasUnread) ?? open[0]
  if (target) void navigateTo(channelLink(group.value.slug, target.id), { replace: true })
}
watch(channelId, id => { if (id && lastChannelKey.value) localStorage.setItem(lastChannelKey.value, id) })
let request = 0
async function load() {
  const generation = ++request
  loading.value = true
  error.value = null
  try {
    const next = await apiFetchData<CommunityGroupShell>(`/groups/by-slug/${encodeURIComponent(String(route.params.slug))}`)
    if (generation !== request) return
    group.value = next
    context.value = next
    appHeader.value = groupHeader(next)
    await state.load()
    if (channelId.value && lastChannelKey.value) localStorage.setItem(lastChannelKey.value, channelId.value)
    await nextTick()
    openDefaultChannel()
  } catch (cause) { if (generation === request) error.value = getSafeUserErrorMessage(cause) || 'Couldn’t load channels.' }
  finally { if (generation === request) loading.value = false }
}
async function openAttention() { attentionOpen.value = true; await state.loadAttention() }
onMounted(load)
watch(() => route.params.slug, load)
onBeforeUnmount(() => { request++; context.value = null; if (!isGroupRoute(route.path) && appHeader.value?.title === group.value?.name) appHeader.value = null })
</script>
<style scoped>
.channel-page { container-type: inline-size; }
/* Compositor-only entrance: slides in from the right edge with no width or layout animation, so the conversation beside it never reflows mid-frame. */
.channel-thread { animation: thread-in 0.34s cubic-bezier(0.22, 1, 0.36, 1) both; will-change: transform; contain: layout paint; }
@keyframes thread-in { from { transform: translate3d(100%, 0, 0); } to { transform: none; } }
@media (prefers-reduced-motion: reduce) { .channel-thread { animation: none; } }
.has-channel .channel-list { display: none; }
.has-thread .channel-conversation { display: none; }
@container (min-width: 640px) { .has-channel:not(.has-thread) .channel-list { display: block; width: 240px; } .has-channel:not(.has-thread) :deep(.channel-back) { display: none; } }
@container (min-width: 680px) { .has-thread .channel-conversation { display: flex; min-width: 360px; } .channel-thread { min-width: 320px; } }
@container (min-width: 920px) { .has-channel.has-thread .channel-list { display: block; width: 240px; } .has-channel.has-thread :deep(.channel-back) { display: none; } }
@container (min-width: 680px) { .channel-thread { animation-name: thread-in-wide; } }
@keyframes thread-in-wide { from { opacity: 0; transform: translate3d(72px, 0, 0); } to { opacity: 1; transform: none; } }
@container (min-width: 1100px) { .channel-thread { flex: 0 0 380px; } }
</style>
