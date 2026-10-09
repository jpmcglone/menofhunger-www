<template>
  <Dialog v-model:visible="visible" modal :header="pins ? `Pinned in ${channelTitle(channel)}` : 'Search this group'" class="w-full max-w-xl">
    <div class="mb-3 flex border-b moh-border"><button type="button" class="moh-focus min-h-11 flex-1" :class="!pins ? 'font-semibold' : 'moh-text-muted'" @click="pins = false">Messages</button><button type="button" class="moh-focus min-h-11 flex-1" :class="pins ? 'font-semibold' : 'moh-text-muted'" @click="pins = true">Pinned</button></div>
    <template v-if="!pins">
      <InputText v-model="query" placeholder="Search messages" aria-label="Search messages" class="mb-3 w-full" autofocus />
      <div class="mb-3 flex gap-2" role="radiogroup" aria-label="Search scope">
        <button v-for="option in scopes" :key="option.id" type="button" role="radio" :aria-checked="scope === option.id" class="moh-focus min-h-11 rounded-full border px-4 text-sm moh-border" :class="scope === option.id ? 'font-semibold moh-surface-2' : 'moh-text-muted'" @click="scope = option.id">{{ option.label }}</button>
      </div>
    </template>
    <p v-if="error" role="alert" class="py-3 text-sm text-red-600">{{ error }}</p><p v-else-if="loading" role="status" class="py-3 text-sm moh-text-muted">Searching…</p><p v-else-if="!results.length" class="py-3 text-sm moh-text-muted">{{ pins ? 'No pinned messages.' : query ? 'No messages found.' : scope === 'channel' ? `Search messages in ${channelTitle(channel)}.` : 'Search messages in every channel you can read.' }}</p>
    <div class="max-h-[60dvh] overflow-y-auto moh-divide"><NuxtLink v-for="message in results" :key="message.id" :to="channelLink(group.slug, message.channelId, message)" class="moh-focus block py-3" @click="visible = false"><span class="flex items-baseline gap-2"><strong class="text-sm">{{ message.sender.name ?? message.sender.username }}</strong><span v-if="scope === 'group' && !pins" class="text-xs moh-text-muted">#{{ channelName(message.channelId) }}</span></span><p class="mt-1 line-clamp-4 text-sm whitespace-pre-wrap">{{ message.body || 'Attachment' }}</p><time class="text-xs moh-text-muted" :datetime="message.createdAt">{{ formatLocaleDateTime(new Date(message.createdAt)) }}</time></NuxtLink><button v-if="nextCursor" type="button" class="moh-focus min-h-11 w-full text-sm" :disabled="loadingMore" @click="more">{{ loadingMore ? 'Loading…' : 'More results' }}</button></div>
  </Dialog>
</template>
<script setup lang="ts">
import { formatLocaleDateTime } from '~/utils/time-format'
import type { ChannelMessage, CommunityGroupShell, GroupChannel } from '~/types/api'
import { groupChannelsKey } from '~/composables/channels/useGroupChannels'
import { channelLink, channelPath, channelTitle } from '~/utils/channels/reducer'
import { getSafeUserErrorMessage } from '~/utils/api-error'
const props = defineProps<{ group: CommunityGroupShell; channel: GroupChannel; startOnPins?: boolean }>()
const visible = defineModel<boolean>({ required: true })
const state = inject(groupChannelsKey, null)
const query = ref(''), pins = ref(false), scope = ref<'channel' | 'group'>('channel')
const searchFeed = useCursorFeed<ChannelMessage>({
  stateKey: 'channel-search',
  stateMode: 'local',
  getItemId: (item) => item.id,
  buildRequest: (before) => {
    if (!visible.value) return null
    // Pins are a single unpaged list.
    if (pins.value) return before ? null : { path: `${channelPath(props.group.id, props.channel.id)}/pins` }
    if (!query.value.trim()) return null
    return {
      path: `/groups/${encodeURIComponent(props.group.id)}/channels/search`,
      query: { q: query.value, channelId: scope.value === 'channel' ? props.channel.id : undefined, before: before ?? undefined },
    }
  },
  formatError: (cause) => getSafeUserErrorMessage(cause),
})
const { items: results, nextCursor, loadingMore, error } = searchFeed
const debouncing = ref(false)
const loading = computed(() => debouncing.value || searchFeed.loading.value)
const scopes = computed(() => [{ id: 'channel' as const, label: channelTitle(props.channel) }, { id: 'group' as const, label: 'All channels' }])
const channelName = (id: string) => { const found = state?.channels.value.find(item => item.id === id); return found ? channelTitle(found) : 'channel' }
let debounce: ReturnType<typeof setTimeout> | undefined
watch(visible, open => { if (open) pins.value = !!props.startOnPins })
watch([visible, query, pins, scope], () => {
  clearTimeout(debounce)
  searchFeed.invalidate()
  nextCursor.value = null
  loadingMore.value = false
  if (!visible.value || (!pins.value && !query.value.trim())) {
    debouncing.value = false
    results.value = []
    return
  }
  debouncing.value = true
  debounce = setTimeout(() => {
    debouncing.value = false
    void searchFeed.refresh()
  }, 250)
})
function more() {
  void searchFeed.loadMore()
}
onBeforeUnmount(() => { clearTimeout(debounce); searchFeed.invalidate() })
</script>
