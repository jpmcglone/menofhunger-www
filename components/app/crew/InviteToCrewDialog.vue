<template>
  <Dialog
    v-model:visible="visible"
    modal
    :header="viewerHasCrew ? 'Add to my Crew' : 'Invite to Crew'"
    :style="{ width: '380px' }"
    :closable="!sending"
    @hide="onHide"
  >
    <div class="space-y-3">
      <p v-if="!viewerHasCrew" class="text-xs moh-text-muted">
        You'll create a new Crew and
        <span class="font-semibold moh-text">{{ inviteeName }}</span> will be your first invite.
      </p>
      <p v-else class="text-xs moh-text-muted">
        Send a Crew invite to <span class="font-semibold moh-text">{{ inviteeName }}</span>.
      </p>

      <label class="block text-sm font-medium moh-text">Message <span class="moh-text-muted font-normal">(optional)</span></label>
      <Textarea
        v-model="message"
        class="w-full min-h-[72px]"
        maxlength="500"
        :disabled="sending"
        placeholder="Add a personal note to your invite…"
        autofocus
      />

      <AppInlineAlert v-if="error" severity="danger">{{ error }}</AppInlineAlert>
    </div>

    <template #footer>
      <Button
        label="Cancel"
        text
        severity="secondary"
        :disabled="sending"
        @click="close"
      />
      <Button
        label="Send invite"
        rounded
        :loading="sending"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { getApiErrorMessage } from '~/utils/api-error'

const props = defineProps<{
  modelValue: boolean
  inviteeUserId: string | null
  inviteeName: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'invited'): void
}>()

const crewApi = useCrew()
const { push: pushToast } = useAppToast()
const viewerCrew = useViewerCrew()

const viewerHasCrew = computed(() => Boolean(viewerCrew.membership.value))

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const message = ref('')
const sending = ref(false)
const error = ref<string | null>(null)

function close() {
  visible.value = false
}

function onHide() {
  message.value = ''
  error.value = null
}

async function submit() {
  if (!props.inviteeUserId || sending.value) return
  sending.value = true
  error.value = null
  try {
    await crewApi.sendInvite({
      inviteeUserId: props.inviteeUserId,
      message: message.value.trim() || null,
    })
    pushToast({ title: 'Invite sent', tone: 'success' })
    emit('invited')
    close()
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Could not send that invite.'
  } finally {
    sending.value = false
  }
}
</script>
