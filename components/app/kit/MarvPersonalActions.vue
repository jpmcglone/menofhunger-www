<template>
  <div class="space-y-4">
    <p class="text-sm moh-text-muted">Ask MARV to save a post, adjust your notifications, or prepare a post or check-in draft. Review it here before applying.</p>
    <p v-if="error || actionError" role="alert" class="text-sm text-red-600">{{ actionError || error }}</p>
    <Button v-if="error" label="Try again" text @click="refresh" />
    <div v-if="!data && loading" class="space-y-3"><AppMarvMark :size="28" loading /><span class="moh-text-muted">Loading MARV actions…</span></div>
    <p v-else-if="data?.length === 0" class="py-6 text-sm moh-text-muted">Your next action starts in the conversation. Nothing is changed until you approve it.</p>
    <div class="moh-divide">
      <article v-for="action in data" :key="action.id" class="py-4">
        <div class="flex justify-between gap-3"><h3 class="font-semibold">{{ action.title }}</h3><span class="text-xs moh-text-muted">{{ action.status }}</span></div>
        <p class="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">{{ action.preview }}</p>
        <p v-if="action.receipt" class="mt-3 text-sm moh-text-muted" role="status">{{ action.receipt }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <template v-if="action.status === 'pending'"><Button :label="action.kind === 'draft' ? 'Keep draft' : 'Apply'" :disabled="!!busy" :loading="busy === action.id" @click="decide(action.id, 'confirm')" ><template #loadingicon><AppMarvMark :size="18" loading /></template></Button><Button label="Dismiss" text :disabled="!!busy" @click="decide(action.id, 'cancel')" /></template>
          <Button v-if="action.draft" :label="copied === action.id ? 'Copied' : 'Copy draft'" outlined @click="copyDraft(action)" />
        </div>
      </article>
    </div>
    <p v-if="data?.length" class="text-xs moh-text-muted">Latest 30 actions · proposals expire after 24 hours · drafts are never published automatically</p>
  </div>
</template>
<script setup lang="ts">
import type { MarvinPersonalActionDto } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'
const { data, error, loading, refresh } = usePrivateApiData<MarvinPersonalActionDto[]>('/marvin/actions')
const { apiFetchData } = useApiClient()
const busy = ref<string | null>(null)
const copied = ref<string | null>(null)
const actionError = ref<string | null>(null)
async function decide(id: string, decision: 'confirm' | 'cancel') {
  if (busy.value) return
  busy.value = id
  actionError.value = null
  try { await apiFetchData(`/marvin/actions/${id}`, { method: 'POST', body: { decision }, retry: 0 }); await refresh() }
  catch (err) { actionError.value = getSafeUserErrorMessage(err, 'Could not confirm completion. Refresh to check its status.'); await refresh() }
  finally { busy.value = null }
}
async function copyDraft(action: MarvinPersonalActionDto) {
  try { await navigator.clipboard.writeText(action.draft ?? ''); copied.value = action.id }
  catch { actionError.value = 'Could not copy. Select the draft text to copy it.' }
}
</script>
