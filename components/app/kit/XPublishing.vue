<template>
  <div>
    <button class="min-h-11 w-full text-left px-4 moh-text-muted text-sm" @click="open">Review X publication</button>
    <Dialog v-model:visible="visible" modal header="Review X publication" :style="{ width: '38rem', maxWidth: '96vw' }">
      <p v-if="error" role="alert">{{ error }}</p>
      <p v-if="queued" role="status">Queued for X. Follow delivery status on your post.</p>
      <div v-else-if="workspace" class="space-y-4">
        <p>Posting as @{{ workspace.username ?? 'unknown' }}</p>
        <a v-if="workspace.remoteUrl" :href="workspace.remoteUrl" target="_blank" rel="noopener noreferrer" class="underline">View existing copy on X</a>
        <p v-if="workspace.reason">{{ workspace.reason }}</p>
        <p v-if="workspace.needsAttention">Check the existing copy on X before publishing again.</p>
        <a v-for="(url, index) in workspace.needsAttention ? workspace.confirmedUrls : []" :key="url" :href="url" target="_blank" rel="noopener noreferrer" class="block underline">Confirmed X part {{ index + 1 }}</a>
        <form v-if="workspace.available && !workspace.needsAttention" class="space-y-4" @submit.prevent="publish">
          <label v-if="workspace.canEdit" class="flex gap-3 items-center min-h-11"><Checkbox v-model="editing" binary :disabled="busy" />Edit the existing X copy</label>
          <div v-for="(_, index) in parts" :key="index" class="space-y-2">
            <label :for="`x-part-${index}`">Post {{ index + 1 }} of {{ parts.length }}</label>
            <Textarea :id="`x-part-${index}`" v-model="parts[index]" :disabled="busy" :maxlength="25000" rows="5" class="w-full" />
            <p class="moh-meta moh-text-muted">{{ xWeightedLength(parts[index] ?? '') }} weighted characters</p>
            <Button v-if="parts.length > 1" :label="`Remove part ${index + 1}`" text severity="danger" :disabled="busy" @click="parts.splice(index, 1)" />
          </div>
          <Button v-if="!editing && !workspace.hasPoll && parts.length < 20" label="Add thread part" text :disabled="busy" @click="parts.push('')" />
          <template v-if="!editing">
            <label for="x-relationship" class="block">Publish as</label>
            <select id="x-relationship" v-model="relationship" class="moh-surface-2 p-3 w-full" :disabled="busy">
              <option value="none">New post</option><option value="reply">Reply</option><option v-if="workspace.canQuote" value="quote">Quote</option>
            </select>
            <label v-if="relationship !== 'none'" class="block">Original X post ID<InputText v-model="target" inputmode="numeric" class="block w-full mt-2" :disabled="busy" /></label>
          </template>
          <p v-if="workspace.mediaCount">Includes all {{ workspace.mediaCount }} attachments from your MOH post, on the first X part.</p>
          <p v-if="workspace.hasPoll">Includes your poll's text choices and remaining duration. X has separate votes.</p>
          <p>Maximum API reservation: {{ integrationDollars(maximum) }}</p>
          <p>{{ editing ? 'Edits depend on X eligibility and its editing window.' : `Uses ${parts.length} of your monthly post slots.` }}</p>
          <p class="moh-meta moh-text-muted">A thread containing a link uses the shared high-cost allowance. An uncertain result is held for review without automatic resend.</p>
          <Button type="submit" :label="editing ? 'Queue X edit' : 'Queue X publication'" :loading="busy" :disabled="busy || !valid" />
        </form>
      </div>
      <p v-else-if="loading" role="status">Loading X options…</p>
    </Dialog>
  </div>
</template>
<script setup lang="ts">
import type { XPublishingWorkspaceDto } from '~/types/api-contracts.gen'
import { xContainsLink, xWeightedLength } from '~/utils/crosspost'
import { integrationDollars } from '~/utils/integration-money'
import { getApiErrorMessage } from '~/utils/api-error'
const props = defineProps<{ postId: string }>()
const { apiFetchData } = useApiClient()
const visible = ref(false), loading = ref(false), busy = ref(false), queued = ref(false), editing = ref(false)
const workspace = ref<XPublishingWorkspaceDto | null>(null)
const parts = ref(['']), relationship = ref('none'), target = ref(''), error = ref('')
let revision = 0
const maximum = computed(() => parts.value.reduce((sum, text) => sum + Math.max(workspace.value?.postMaxMicros ?? 0, xContainsLink(text) ? 200000 : 15000), 0) + (workspace.value?.mediaCount ?? 0) * (workspace.value?.mediaMaxMicros ?? 0))
const valid = computed(() => {
  const value = workspace.value
  return value && (!value.remoteUrl || editing.value) && (!editing.value || parts.value.length === 1)
    && (editing.value || relationship.value === 'none' || /^\d{1,19}$/.test(target.value))
    && parts.value.every((text, index) => (text.trim() || (index === 0 && value.mediaCount > 0)) && (xWeightedLength(text) <= 280 || (parts.value.length === 1 && value.canLongText && text.length <= 25000)))
})
watch(() => props.postId, () => { revision++; visible.value = false; workspace.value = null })
watch(editing, value => { if (value) relationship.value = 'none' })
async function open() {
  const version = ++revision, id = props.postId
  visible.value = true; loading.value = true; error.value = ''; workspace.value = null; queued.value = false; editing.value = false; relationship.value = 'none'; target.value = ''
  try {
    const data = await apiFetchData<XPublishingWorkspaceDto>(`/me/integrations/x/publishing/${encodeURIComponent(id)}`)
    if (version !== revision) return
    workspace.value = data; parts.value = [data.text]
  } catch (e) { if (version === revision) error.value = getApiErrorMessage(e) || 'Could not load X options.' }
  finally { if (version === revision) loading.value = false }
}
async function publish() {
  if (!workspace.value || !valid.value || busy.value) return
  busy.value = true
  const version = revision
  try {
    await apiFetchData(`/me/integrations/x/publishing/${encodeURIComponent(props.postId)}`, { method: 'POST', body: {
      sourceHash: workspace.value.sourceHash, parts: parts.value, edit: editing.value,
      replyToId: relationship.value === 'reply' ? target.value : null, quoteId: relationship.value === 'quote' ? target.value : null,
    } })
    if (version === revision) queued.value = true
  } catch (e) { if (version === revision) error.value = getApiErrorMessage(e) || 'Could not queue X publication.' }
  finally { busy.value = false }
}
</script>
