<template>
  <Dialog
    v-model:visible="visibleProxy"
    modal
    :header="headerText"
    :draggable="false"
    class="w-[min(38rem,calc(100vw-2rem))]"
  >
    <div class="space-y-4">
      <div class="text-sm moh-text-muted">
        Reporting helps keep the community safe. Please choose the closest reason and add details if helpful.
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Reason</label>
        <Select
          v-model="reason"
          :options="reasonOptions"
          option-label="label"
          option-value="value"
          placeholder="Select a reason…"
          class="w-full"
        />
      </div>

      <div class="space-y-2">
        <label class="text-sm font-medium text-gray-700 dark:text-gray-200">Details (optional)</label>
        <Textarea
          v-model="details"
          class="w-full"
          rows="4"
          autoResize
          placeholder="Add context (what happened, why it’s harmful, etc.)"
        />
      </div>

      <AppInlineAlert v-if="error" severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>

    <template #footer>
      <Button label="Cancel" severity="secondary" text :disabled="submitting" @click="close()" />
      <Button
        label="Submit report"
        icon="pi pi-flag"
        :loading="submitting"
        :disabled="submitting || !canSubmit"
        @click="submit()"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'
import type { ReportItem, ReportReason, ReportTargetType } from '~/types/api'

const props = withDefaults(
  defineProps<{
    visible: boolean
    targetType: ReportTargetType
    subjectPostId?: string | null
    subjectUserId?: string | null
    subjectLabel?: string | null
  }>(),
  { subjectPostId: null, subjectUserId: null, subjectLabel: null }
)

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'submitted', report: ReportItem): void
}>()

const visibleProxy = computed({
  get: () => props.visible,
  set: (v: boolean) => emit('update:visible', v),
})

const headerText = computed(() => {
  const label = (props.subjectLabel ?? '').trim()
  if (props.targetType === 'post') return label ? `Report post (${label})` : 'Report post'
  return label ? `Report user (${label})` : 'Report user'
})

const reasonOptions: Array<{ label: string; value: ReportReason }> = [
  { label: 'Spam', value: 'spam' },
  { label: 'Harassment', value: 'harassment' },
  { label: 'Hate', value: 'hate' },
  { label: 'Sexual content', value: 'sexual' },
  { label: 'Violence', value: 'violence' },
  { label: 'Illegal content', value: 'illegal' },
  { label: 'Other', value: 'other' },
]

const reason = ref<ReportReason | null>(null)
const details = ref('')
const error = ref<string | null>(null)
const submitting = ref(false)

const canSubmit = computed(() => Boolean(reason.value))

const toast = useAppToast()
const { apiFetchData } = useApiClient()

watch(
  () => props.visible,
  (v) => {
    if (!v) return
    // Reset whenever the dialog opens.
    reason.value = null
    details.value = ''
    error.value = null
    submitting.value = false
  }
)

function close() {
  visibleProxy.value = false
}

async function submit() {
  if (!reason.value) return
  if (submitting.value) return
  error.value = null
  submitting.value = true
  try {
    const report = await apiFetchData<ReportItem>('/reports', {
      method: 'POST',
      body: {
        targetType: props.targetType,
        subjectPostId: props.subjectPostId ?? undefined,
        subjectUserId: props.subjectUserId ?? undefined,
        reason: reason.value,
        details: details.value.trim() ? details.value.trim() : null,
      },
    })
    toast.push({ title: 'Report submitted', tone: 'success', durationMs: 2200 })
    emit('submitted', report)
    close()
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to submit report.'
  } finally {
    submitting.value = false
  }
}
</script>

