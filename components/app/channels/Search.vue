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
    <div class="max-h-[60dvh] overflow-y-auto moh-divide"><NuxtLink v-for="message in results" :key="message.id" :to="channelLink(group.slug, message.channelId, message)" class="moh-focus block py-3" @click="visible = false"><span class="flex items-baseline gap-2"><strong class="text-sm">{{ message.sender.name ?? message.sender.username }}</strong><span v-if="scope === 'group' && !pins" class="text-xs moh-text-muted">#{{ channelName(message.channelId) }}</span></span><p class="mt-1 line-clamp-4 text-sm whitespace-pre-wrap">{{ message.body || 'Attachment' }}</p><time class="text-xs moh-text-muted" :datetime="message.createdAt">{{ new Date(message.createdAt).toLocaleString() }}</time></NuxtLink><button v-if="nextCursor" type="button" class="moh-focus min-h-11 w-full text-sm" :disabled="loadingMore" @click="more">{{ loadingMore ? 'Loading…' : 'More results' }}</button></div>
  </Dialog>
</template>
<script setup lang="ts">
import type { ChannelMessage, CommunityGroupShell, GroupChannel } from '~/types/api'
import { groupChannelsKey } from '~/composables/channels/useGroupChannels'
import { channelLink, channelPath, channelTitle } from '~/utils/channels/reducer'
import { getSafeUserErrorMessage } from '~/utils/api-error'
const props = defineProps<{ group: CommunityGroupShell; channel: GroupChannel; startOnPins?: boolean }>()
const visible = defineModel<boolean>({ required: true })
const state = inject(groupChannelsKey, null)
const { apiFetch, apiFetchData } = useApiClient()
const nextCursor = ref<string | null>(null), loadingMore = ref(false)
const query = ref(''), pins = ref(false), scope = ref<'channel' | 'group'>('channel'), loading = ref(false), error = ref<string | null>(null), results = ref<ChannelMessage[]>([])
const scopes = computed(() => [{ id: 'channel' as const, label: channelTitle(props.channel) }, { id: 'group' as const, label: 'All channels' }])
const channelName = (id: string) => { const found = state?.channels.value.find(item => item.id === id); return found ? channelTitle(found) : 'channel' }
const searchQuery = (before?: string) => ({ q: query.value, channelId: scope.value === 'channel' ? props.channel.id : undefined, before })
let request = 0
watch(visible, open => { if (open) pins.value = !!props.startOnPins })
watch([visible, query, pins, scope], async () => {
  const generation = ++request
  nextCursor.value = null; loadingMore.value = false
  if (!visible.value) { results.value = []; return }
  if (!pins.value && !query.value.trim()) { results.value = []; return }
  loading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 250))
    if (generation !== request) return
    const response = pins.value
      ? { data: await apiFetchData<ChannelMessage[]>(`${channelPath(props.group.id, props.channel.id)}/pins`), pagination: { nextCursor: null } }
      : await apiFetch<ChannelMessage[]>(`/groups/${encodeURIComponent(props.group.id)}/channels/search`, { query: searchQuery() })
    if (generation === request) { results.value = response.data; nextCursor.value = typeof response.pagination?.nextCursor === 'string' ? response.pagination.nextCursor : null; error.value = null }
  } catch (cause) { if (generation === request) error.value = getSafeUserErrorMessage(cause) }
  finally { if (generation === request) loading.value = false }
})
async function more() {
  if (!nextCursor.value || loadingMore.value) return
  const generation = request
  loadingMore.value = true
  try {
    const response = await apiFetch<ChannelMessage[]>(`/groups/${encodeURIComponent(props.group.id)}/channels/search`, { query: searchQuery(nextCursor.value) })
    if (generation !== request) return
    const ids = new Set(results.value.map(item => item.id))
    results.value.push(...response.data.filter(item => !ids.has(item.id)))
    nextCursor.value = typeof response.pagination?.nextCursor === 'string' ? response.pagination.nextCursor : null
  } catch (cause) { if (generation === request) error.value = getSafeUserErrorMessage(cause) }
  finally { if (generation === request) loadingMore.value = false }
}
onBeforeUnmount(() => { request++ })
</script>
