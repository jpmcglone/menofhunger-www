<template>
  <form class="shrink-0 border-t moh-border p-3" @submit.prevent="send" @paste="paste">
    <p v-if="error" class="mb-2 text-sm text-red-600" role="alert">{{ error }}</p>
    <div v-if="files.length || gif" class="mb-2 flex flex-wrap items-center gap-3">
      <div v-for="(item, tileIndex) in files" :key="`${item.name}:${item.size}:${tileIndex}`" class="relative" :title="`${item.name} · ${formatBytes(item.size)}`">
        <AppChannelsAttachmentTile :file="item" state="ready" />
        <button class="moh-focus absolute -right-3 -top-3 flex size-11 items-center justify-center" type="button" :aria-label="`Remove ${item.name}`" @click="files = files.filter((_, at) => at !== tileIndex); changed()"><span class="flex size-6 items-center justify-center rounded-full bg-black text-white"><Icon name="tabler:x" size="14" aria-hidden="true" /></span></button>
      </div>
      <div v-if="gif" class="relative">
        <AppChannelsAttachmentTile :image-url="gif.url" state="ready" />
        <button class="moh-focus absolute -right-3 -top-3 flex size-11 items-center justify-center" type="button" aria-label="Remove GIF" @click="gif = undefined; changed()"><span class="flex size-6 items-center justify-center rounded-full bg-black text-white"><Icon name="tabler:x" size="14" aria-hidden="true" /></span></button>
      </div>
      <p v-if="files.length" class="text-xs moh-text-muted">{{ files.length }} of {{ CHANNEL_MAX_ATTACHMENTS }}</p>
    </div>
    <div v-if="suggestions.length" role="listbox" aria-label="Mention suggestions" class="mb-2 max-h-40 overflow-y-auto rounded-lg border moh-border"><button v-for="(member, index) in suggestions" :key="member.user.id" type="button" role="option" :aria-selected="index === mentionIndex" class="moh-focus block min-h-11 w-full px-3 text-left text-sm" :class="index === mentionIndex ? 'bg-[var(--moh-surface-2)]' : ''" @click="mention(member)">{{ member.user.name ?? member.user.username }} <span class="moh-text-muted">@{{ member.user.username }}</span></button></div>
    <div v-if="voice.recording.value" class="flex min-h-11 items-center gap-3"><AppChatVoiceLevel :level="voice.level.value" /><span class="text-sm tabular-nums">Recording · {{ Math.floor(voice.elapsed.value) }}s</span><button type="button" class="moh-focus min-h-11 px-2" @click="voice.cancel">Discard</button><button type="button" class="moh-focus min-h-11 px-2 font-semibold" @click="stopVoice">Done</button></div>
    <div v-else class="rounded-xl border moh-border">
      <textarea ref="input" v-model="text" rows="2" maxlength="2000" class="moh-focus block w-full resize-none bg-transparent px-3 pt-3 text-[15px]" :placeholder="rootId ? 'Reply in thread' : `Message ${channelTitle(channel)}`" :aria-label="rootId ? 'Reply in thread' : `Message #${channel.name}`" :disabled="!ready || !channel.capabilities.canSend" @input="changed(); searchMentions(); notifyTyping()" @blur="stopTyping" @keydown="keyDown" />
      <div class="flex items-center px-1">
        <button type="button" class="moh-focus size-11" aria-label="Attach image, video, or audio" :disabled="files.length >= CHANNEL_MAX_ATTACHMENTS || !!gif || !ready" @click="picker?.click()"><Icon name="tabler:plus" /></button>
        <button type="button" class="moh-focus size-11 text-sm font-semibold" aria-label="Add GIF" :disabled="files.length > 0 || !!gif || !ready" @click="gifOpen = true; searchGIF()">GIF</button>
        <button type="button" class="moh-focus size-11" aria-label="Record voice message" :disabled="files.length >= CHANNEL_MAX_ATTACHMENTS || !!gif || voice.starting.value || !ready" @click="startVoice"><Icon name="tabler:microphone" /></button>
        <span class="ml-auto text-xs moh-text-muted">{{ text.length ? `${text.length}/2000` : '' }}</span><button type="submit" class="moh-focus ml-2 size-11" aria-label="Send message" :disabled="!ready || !channel.capabilities.canSend || (!text.trim() && !files.length && !gif)"><Icon name="tabler:send" /></button>
      </div>
    </div>
    <input ref="picker" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm,audio/mp4,audio/wav,audio/aac" multiple hidden @change="pick" >
    <AppComposerGiphyPickerDialog :open="gifOpen" :query="gifQuery" :loading="gifLoading" :error="gifError" :items="gifs" :can-add-more="!files.length && !gif" @update:open="gifOpen = $event" @update:query="gifQuery = $event" @search="searchGIF" @select="selectGIF" />
  </form>
</template>
<script setup lang="ts">
import type { CommunityGroupShell, GroupChannel, GiphyItem } from '~/types/api'
import { channelPath, channelTitle } from '~/utils/channels/reducer'
import { CHANNEL_MAX_ATTACHMENTS, destinationDraftKey, loadChannelDraft, saveChannelDraft } from '~/utils/channels/drafts'
import { useChannelOutbox } from '~/composables/channels/useChannelOutbox'
import { useVoiceRecorder } from '~/composables/chat/useVoiceRecorder'
import { getSafeUserErrorMessage } from '~/utils/api-error'
import { formatBytes } from '~/utils/channels/format'
type Mention = { user: { id: string; username: string | null; name: string | null } }
const props = defineProps<{ group: CommunityGroupShell; channel: GroupChannel; rootId?: string }>()
const { user } = useAuth()
const { apiFetchData } = useApiClient()
const outbox = useChannelOutbox()
const voice = useVoiceRecorder()
const text = ref(''), files = shallowRef<File[]>([]), gif = ref<GiphyItem>()
const ready = ref(false), error = ref<string | null>(null)
const input = ref<HTMLTextAreaElement | null>(null), picker = ref<HTMLInputElement | null>(null)
const gifOpen = ref(false), gifQuery = ref(''), gifLoading = ref(false), gifError = ref<string | null>(null), gifs = ref<GiphyItem[]>([])
const suggestions = ref<Mention[]>([]), mentionIndex = ref(0)
let sending = false
let identity = '', key = '', revision = '', requestId = '', closed = false, mentionRequest = 0
function snapshot() { return { text: text.value, files: files.value, gif: gif.value, revision, requestId } }
async function persist() {
  if (!ready.value || !key) return
  try { await saveChannelDraft(key, snapshot()) }
  catch (cause) { error.value = getSafeUserErrorMessage(cause, 'Couldn’t save this draft on your device.') }
}
// One start event, refreshed every 2.5s while typing; one stop after idle, on blur, send or unmount.
const presence = usePresence()
let typingSince = 0, typingIdle: ReturnType<typeof setTimeout> | undefined
function stopTyping() {
  clearTimeout(typingIdle)
  if (!typingSince) return
  typingSince = 0
  presence.emitChannelTyping(props.channel.id, false, props.rootId)
}
function notifyTyping() {
  if (!text.value.trim()) return stopTyping()
  if (Date.now() - typingSince > 2500) { typingSince = Date.now(); presence.emitChannelTyping(props.channel.id, true, props.rootId) }
  clearTimeout(typingIdle)
  typingIdle = setTimeout(stopTyping, 4000)
}
function changed() { revision = crypto.randomUUID(); requestId = crypto.randomUUID(); void persist() }
async function send() {
  if (sending || !ready.value || identity !== user.value?.id || !props.channel.capabilities.canSend) return
  stopTyping()
  const submitted = snapshot()
  if (!submitted.text.trim() && !submitted.files.length && !submitted.gif) return
  const destination = { identity, groupId: props.group.id, channelId: props.channel.id, rootId: props.rootId, draftKey: key }
  sending = true
  await persist()
  sending = false
  if (closed || user.value?.id !== destination.identity) return
  outbox.enqueue({ id: submitted.requestId, ...destination, input: { body: submitted.text.trim(), clientRequestId: submitted.requestId, threadRootId: destination.rootId, giphy: submitted.gif ? { url: submitted.gif.url, ...(submitted.gif.mp4Url ? { mp4Url: submitted.gif.mp4Url } : {}), ...(submitted.gif.width ? { width: submitted.gif.width } : {}), ...(submitted.gif.height ? { height: submitted.gif.height } : {}) } : undefined }, files: submitted.files.length ? submitted.files : undefined, status: 'sending', draftRevision: submitted.revision, queuedAt: new Date().toISOString() })
  if (revision !== submitted.revision) return
  text.value = ''; files.value = []; gif.value = undefined; suggestions.value = []
  revision = crypto.randomUUID(); requestId = crypto.randomUUID()
  input.value?.focus()
}
function pick(event: Event) { attachAll([...(event.target as HTMLInputElement).files ?? []]); (event.target as HTMLInputElement).value = '' }
function attachAll(values: File[]) {
  if (!values.length) return
  const room = CHANNEL_MAX_ATTACHMENTS - files.value.length
  const accepted: File[] = []
  for (const value of values.slice(0, Math.max(room, 0))) {
    if (value.type.startsWith('video/') && !user.value?.premium && !user.value?.premiumPlus) { error.value = 'Video uploads are for premium members.'; continue }
    accepted.push(value)
  }
  if (values.length > room) error.value = `You can attach up to ${CHANNEL_MAX_ATTACHMENTS} items.`
  else if (accepted.length === values.length) error.value = null
  if (!accepted.length) return
  files.value = [...files.value, ...accepted]; gif.value = undefined; changed()
}
function paste(event: ClipboardEvent) { const values = [...event.clipboardData?.files ?? []]; if (values.length) { event.preventDefault(); attachAll(values) } }
function selectGIF(value: GiphyItem) { gif.value = value; gifOpen.value = false; changed() }
async function searchGIF() { gifLoading.value = true; try { gifs.value = await apiFetchData<GiphyItem[]>(gifQuery.value ? '/giphy/search' : '/giphy/trending', { query: { q: gifQuery.value || undefined } }); gifError.value = null } catch (cause) { gifError.value = getSafeUserErrorMessage(cause) } finally { gifLoading.value = false } }
async function startVoice() { try { await voice.start() } catch (cause) { error.value = getSafeUserErrorMessage(cause, 'Microphone unavailable.') } }
async function stopVoice() { const recording = await voice.stop(); if (recording) attachAll([recording.file]) }
// Leaders can notify the whole channel; for everyone else the token stays plain text.
const BROADCASTS = [
  { id: 'broadcast:everyone', username: 'everyone', name: 'Notify everyone in this channel' },
  { id: 'broadcast:here', username: 'here', name: 'Notify members online now' },
]
function broadcastSuggestions(query: string): Mention[] {
  if (!props.channel.capabilities.canModerate) return []
  return BROADCASTS.filter(item => item.username.startsWith(query.toLowerCase())).map(item => ({ user: item }))
}
async function searchMentions() {
  const query = text.value.slice(0, input.value?.selectionStart ?? text.value.length).match(/(?:^|\s)@([a-zA-Z0-9_]*)$/)?.[1]
  const request = ++mentionRequest
  if (query === undefined) { suggestions.value = []; return }
  try {
    const results = await apiFetchData<Mention[]>(`${channelPath(props.group.id, props.channel.id)}/members`, { query: { q: query } })
    if (request === mentionRequest && !closed && identity === user.value?.id) { suggestions.value = [...broadcastSuggestions(query), ...results.filter(item => item.user.username)].slice(0, 8); mentionIndex.value = 0 }
  } catch { if (request === mentionRequest) suggestions.value = [] }
}
function mention(value: Mention) {
  const caret = input.value?.selectionStart ?? text.value.length
  text.value = text.value.slice(0, caret).replace(/@[a-zA-Z0-9_]*$/, `@${value.user.username} `) + text.value.slice(caret)
  suggestions.value = []; changed(); input.value?.focus()
}
function keyDown(event: KeyboardEvent) {
  if (event.isComposing) return
  if (suggestions.value.length && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) {
    event.preventDefault()
    if (event.key === 'Escape') suggestions.value = []
    else if (event.key === 'Enter') mention(suggestions.value[mentionIndex.value]!)
    else mentionIndex.value = (mentionIndex.value + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.value.length) % suggestions.value.length
  } else if (event.key === 'Enter' && !event.shiftKey && (event.metaKey || event.ctrlKey || matchMedia('(pointer:fine)').matches)) { event.preventDefault(); void send() }
}
onMounted(async () => {
  identity = user.value?.id ?? ''
  key = destinationDraftKey({ identity, surface: 'channel', destination: props.channel.id, root: props.rootId })
  revision = crypto.randomUUID(); requestId = crypto.randomUUID()
  try {
    const draft = await loadChannelDraft(key)
    if (closed || user.value?.id !== identity) return
    const pending = outbox.entries.value.some(entry => entry.draftKey === key && entry.status !== 'sent')
    if (draft && !pending) { text.value = draft.text; files.value = draft.files ?? (draft.file ? [draft.file] : []); gif.value = draft.gif; revision = draft.revision; requestId = draft.requestId }
  } catch (cause) { error.value = getSafeUserErrorMessage(cause, 'Draft storage unavailable. Keep this page open until your message sends.') }
  ready.value = true
})
watch(() => user.value?.id, () => { ready.value = false; mentionRequest++; suggestions.value = []; voice.cancel(); files.value = []; gif.value = undefined; text.value = '' })
onBeforeUnmount(() => { closed = true; stopTyping(); voice.cancel() })
</script>
