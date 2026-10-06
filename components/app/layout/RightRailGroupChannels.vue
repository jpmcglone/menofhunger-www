<template>
  <section class="pb-8" aria-label="Group channels">
    <div class="moh-gutter-x flex items-center justify-between pb-1">
      <h2 class="moh-h2">Channels</h2>
      <NuxtLink :to="`/groups/${encodeURIComponent(group.slug)}/channels`" class="moh-focus text-sm moh-text-muted hover:underline">Open all</NuxtLink>
    </div>
    <ul v-if="visible.length" class="moh-divide" aria-live="polite">
      <li v-for="channel in visible" :key="channel.id">
        <NuxtLink :to="channelLink(group.slug, channel.id)" class="moh-focus moh-surface-hover flex min-h-12 items-start gap-2.5 px-4 py-2.5">
          <AppChannelsChannelIcon :channel="channel" :size="18" class="mt-0.5" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm" :class="channel.hasUnread || channel.personalCount ? 'font-semibold moh-text' : 'moh-text-muted'">{{ channelTitle(channel) }}</span>
            <Transition name="live" mode="out-in">
              <span v-if="typingByChannel[channel.id]?.length" key="typing" class="flex min-w-0 items-center gap-1.5 text-xs moh-text-soft"><AppChannelsTypingDots :label="`${typingByChannel[channel.id]!.map(item => item.username).join(', ')} typing`" /><span class="truncate">@{{ typingByChannel[channel.id]![0]!.username }}<template v-if="typingByChannel[channel.id]!.length > 1"> +{{ typingByChannel[channel.id]!.length - 1 }}</template></span></span>
              <span v-else-if="live[channel.id]" :key="live[channel.id]!.id" class="block truncate text-xs moh-text-soft"><span class="font-medium">{{ live[channel.id]!.who }}</span> {{ live[channel.id]!.text }}</span>
              <span v-else-if="channel.topic" class="block truncate text-xs moh-text-soft">{{ channel.topic }}</span>
            </Transition>
          </span>
          <span v-if="channel.personalCount" class="rounded-full bg-[var(--moh-text)] px-1.5 text-xs text-[var(--moh-bg)]" :aria-label="`${channel.personalCount} for you`">{{ channel.personalCount }}</span>
          <span v-else-if="channel.hasUnread" class="mt-1.5 size-2 rounded-full bg-[var(--moh-text)]" aria-label="Unread activity" />
        </NuxtLink>
      </li>
    </ul>
    <p v-else-if="loaded" class="px-4 py-3 text-sm moh-text-muted">No channels yet.</p>
    <div v-else class="animate-pulse" aria-hidden="true">
      <div v-for="i in 3" :key="i" class="mx-4 my-3 h-4 rounded-full bg-gray-200 dark:bg-zinc-800" />
    </div>
  </section>
</template>
<script setup lang="ts">
import type { ChannelMessage, CommunityGroupShell, GroupChannel } from '~/types/api'
import type { ChannelCallback } from '~/composables/presence/usePresenceDomains'
import { channelLink, channelTitle, mergeChannel } from '~/utils/channels/reducer'
import { useChannelTyping } from '~/composables/channels/useChannelTyping'

const props = defineProps<{ group: CommunityGroupShell }>()
const { apiFetchData } = useApiClient()
const presence = usePresence()
const { user } = useAuth()
const { typingByChannel } = useChannelTyping(computed(() => props.group.channelsAvailable ? props.group.id : null))
const channels = ref<GroupChannel[]>([])
const loaded = ref(false)
const live = ref<Record<string, { id: string; who: string; text: string }>>({})
const visible = computed(() => channels.value.filter(channel => !channel.archivedAt))
let request = 0

async function load() {
  const generation = ++request
  const groupId = props.group.id
  try {
    const next = await apiFetchData<GroupChannel[]>(`/groups/${encodeURIComponent(groupId)}/channels`)
    if (generation !== request || props.group.id !== groupId) return
    channels.value = next.map(item => mergeChannel(channels.value.find(old => old.id === item.id), item))
  } catch { if (generation === request) channels.value = [] } finally { if (generation === request) loaded.value = true }
}
function describe(message: ChannelMessage) {
  const body = message.body.replace(/\s+/g, ' ').trim()
  const text = body || (message.media?.length ? 'sent an attachment' : '')
  return message.threadRootId && body ? `replied: ${body}` : text
}
const onChannel: ChannelCallback = event => {
  if (event.payload.groupId !== props.group.id) return
  if (event.type === 'typing') return
  if (event.type === 'changed') { void load(); return }
  const index = channels.value.findIndex(channel => channel.id === event.payload.channel.id)
  if (index < 0) { void load(); return }
  if (event.type === 'viewer' && channels.value[index]!.viewerUpdatedAt && (!event.payload.channel.viewerUpdatedAt || channels.value[index]!.viewerUpdatedAt! > event.payload.channel.viewerUpdatedAt)) return
  channels.value[index] = mergeChannel(channels.value[index], event.payload.channel)
  if (event.type !== 'messages') return
  const latest = [...event.payload.messages].reverse().find(message => !message.deletedForAll && describe(message))
  if (latest) {
    const own = latest.sender.id === user.value?.id
    live.value = { ...live.value, [event.payload.channel.id]: { id: latest.id, who: own ? 'You' : (latest.sender.name ?? latest.sender.username ?? 'Someone'), text: describe(latest) } }
  }
}
onMounted(() => { presence.addChannelCallback(onChannel); void load() })
onBeforeUnmount(() => { request++; presence.removeChannelCallback(onChannel) })
watch(() => props.group.id, () => { channels.value = []; live.value = {}; loaded.value = false; void load() })
watch(presence.isSocketConnected, connected => { if (connected) void load() })
</script>
<style scoped>
.live-enter-active, .live-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.live-enter-from { opacity: 0; transform: translateY(3px); }
.live-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) { .live-enter-active, .live-leave-active { transition: none; } }
</style>
