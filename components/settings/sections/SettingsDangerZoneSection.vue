<template>
  <div class="space-y-4">
    <div class="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
      <div class="space-y-1">
        <div class="text-sm font-semibold text-red-800 dark:text-red-300">Delete account</div>
        <p class="text-xs text-red-700 dark:text-red-400 leading-relaxed">
          This is permanent. Your account will be anonymized, your public posts removed, any active Premium subscription cancelled, and all sessions revoked immediately. There is no undo.
        </p>
      </div>

      <Button
        label="Delete my account…"
        severity="danger"
        size="small"
        outlined
        :disabled="deleting"
        @click="confirmVisible = true"
      />
    </div>

    <!-- Confirmation dialog: type username to confirm -->
    <Dialog
      v-model:visible="confirmVisible"
      modal
      header="Delete account"
      :style="{ width: '400px' }"
      :closable="!deleting"
      @hide="onDialogHide"
    >
      <div class="space-y-4">
        <p class="text-sm moh-text leading-relaxed">
          This will permanently delete your account, anonymize your data, cancel any active subscription, and log you out everywhere.
          <strong>This cannot be undone.</strong>
        </p>

        <AppFormField :label="`Type your username to confirm`" :helper="confirmHint">
          <InputText
            v-model="usernameConfirm"
            class="w-full font-mono"
            :placeholder="authUser?.username ?? 'your username'"
            :disabled="deleting"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
            @keydown.enter.prevent="submit"
          />
        </AppFormField>

        <AppFormField label="Reason (optional)">
          <InputText
            v-model="reason"
            class="w-full"
            maxlength="100"
            placeholder="e.g. Taking a break"
            :disabled="deleting"
          />
        </AppFormField>

        <AppFormField label="Anything else to share? (optional)">
          <Textarea
            v-model="details"
            class="w-full min-h-[72px]"
            maxlength="2000"
            placeholder="Optional details…"
            :disabled="deleting"
          />
        </AppFormField>

        <AppInlineAlert v-if="deleteError" severity="danger">{{ deleteError }}</AppInlineAlert>
      </div>

      <template #footer>
        <Button
          label="Cancel"
          text
          severity="secondary"
          :disabled="deleting"
          @click="confirmVisible = false"
        />
        <Button
          label="Delete my account"
          severity="danger"
          :loading="deleting"
          :disabled="!canSubmit"
          icon="tabler:trash"
          @click="submit"
        />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { useDeleteAccount } from '~/composables/settings/useDeleteAccount'

const { user: authUser } = useAuth()
const { deleting, error: deleteError, deleteAccount } = useDeleteAccount()

const confirmVisible = ref(false)
const usernameConfirm = ref('')
const reason = ref('')
const details = ref('')

const confirmHint = computed(() => {
  const un = authUser.value?.username
  return un ? `Enter "${un}" exactly` : undefined
})

const canSubmit = computed(() => {
  const expected = (authUser.value?.username ?? '').trim()
  return Boolean(expected) && usernameConfirm.value.trim() === expected && !deleting.value
})

function onDialogHide() {
  if (deleting.value) return
  usernameConfirm.value = ''
  reason.value = ''
  details.value = ''
  deleteError.value = null
}

async function submit() {
  if (!canSubmit.value) return
  await deleteAccount({
    reason: reason.value.trim() || null,
    details: details.value.trim() || null,
  })
}
</script>
