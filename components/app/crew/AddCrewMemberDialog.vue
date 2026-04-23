<template>
  <Dialog
    v-model:visible="visible"
    modal
    header="Add to Crew"
    :style="{ width: '380px' }"
    :closable="!sending"
    @hide="onHide"
  >
    <div class="space-y-3">
      <p class="text-xs moh-text-muted">
        Search for a verified member to invite to your Crew.
        Users already in another crew are shown but cannot be invited.
      </p>

      <label class="block text-sm font-medium moh-text">Member</label>
      <AppUserSearchPicker
        v-model="selectedUser"
        show="all"
        require-verified
        disable-in-crew
        unselectable-hint="Crews are verified-only — this user isn't verified yet."
        placeholder="Search by username or name…"
        :exclude-user-ids="excludeUserIds"
        :disabled="sending"
        autofocus
      />

      <label class="block text-sm font-medium moh-text">Message <span class="moh-text-muted font-normal">(optional)</span></label>
      <Textarea
        v-model="message"
        class="w-full min-h-[72px]"
        maxlength="500"
        :disabled="sending"
        placeholder="Add a personal note to your invite…"
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
        :disabled="!selectedUser"
        @click="submit"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import type { FollowListUser } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const props = defineProps<{
  modelValue: boolean
  /** User IDs already in the crew or with a pending invite — excluded from search results. */
  excludeUserIds?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'invited', invite: import('~/types/api').CrewInvite): void
}>()

const crewApi = useCrew()
const { push: pushToast } = useAppToast()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const selectedUser = ref<FollowListUser | null>(null)
const message = ref('')
const sending = ref(false)
const error = ref<string | null>(null)

function close() {
  visible.value = false
}

function onHide() {
  selectedUser.value = null
  message.value = ''
  error.value = null
}

async function submit() {
  if (!selectedUser.value || sending.value) return
  sending.value = true
  error.value = null
  try {
    const invite = await crewApi.sendInvite({
      inviteeUserId: selectedUser.value.id,
      message: message.value.trim() || null,
    })
    pushToast({ title: 'Invite sent', tone: 'success' })
    emit('invited', invite)
    close()
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Could not send that invite.'
  } finally {
    sending.value = false
  }
}
</script>
