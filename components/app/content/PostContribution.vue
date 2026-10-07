<template>
  <div v-if="user && !isSelf && post.visibility !== 'onlyMe' && !post.deletedAt && post.viewerCanAccess !== false && post.kind !== 'repost'" class="moh-gutter-x border-b moh-border py-2">
    <button v-if="user.verifiedStatus !== 'none' && post.author.verifiedStatus !== 'none'" type="button" class="inline-flex min-h-9 items-center gap-1.5 text-xs moh-text-muted" :aria-expanded="sending" @click="sending = !sending"><Icon name="tabler:coin" aria-hidden="true" />Send coins</button>
    <form v-if="sending" class="flex flex-wrap items-center gap-2 py-2" @submit.prevent="send">
      <input v-model.number="amount" type="number" min="1" step="1" :max="user.coins" required aria-label="Coins to send" class="w-24 rounded-lg border moh-border moh-surface px-3 py-2 text-sm">
      <button type="submit" :disabled="busy" class="rounded-lg border moh-border px-3 py-2 text-sm disabled:opacity-50">{{ busy ? 'Sending…' : 'Send' }}</button>
      <span class="text-xs moh-text-muted">{{ user.coins ?? 0 }} available</span>
    </form>
    <p v-if="message" role="status" class="py-1 text-xs moh-text-muted">{{ message }}</p>
  </div>
</template>
<script setup lang="ts">
import type { FeedPost } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'
const props = defineProps<{ post: FeedPost }>()
const { user } = useAuth()
const { apiFetchData } = useApiClient()
const isSelf = computed(() => user.value?.id === props.post.author.id)
const sending = ref(false)
const amount = ref(10)
const busy = ref(false)
const message = ref('')
async function send() {
  if (busy.value) return
  busy.value = true
  message.value = ''
  try {
    await apiFetchData('/coins/transfer', { method: 'POST', body: { recipientUsername: props.post.author.username, postId: props.post.id, amount: amount.value } })
    sending.value = false
    message.value = 'Coins sent'
  } catch (e) { message.value = getSafeUserErrorMessage(e, 'Could not send coins.') }
  finally { busy.value = false }
}
</script>
