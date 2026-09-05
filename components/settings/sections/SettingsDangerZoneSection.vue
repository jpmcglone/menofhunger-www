<template>
  <div class="space-y-4">
    <!-- Log out on all devices -->
    <div class="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 p-4 space-y-3">
      <div class="space-y-1">
        <div class="text-sm font-semibold moh-text">Log out on all devices</div>
        <p class="text-xs moh-text-muted leading-relaxed">
          Revokes your session on every browser, phone, and tablet. You'll need to log in again everywhere.
        </p>
      </div>

      <Button
        label="Log out everywhere…"
        severity="secondary"
        size="small"
        outlined
        :loading="loggingOutEverywhere"
        @click="requestLogoutEverywhere"
      />
      <AppInlineAlert v-if="logoutError" severity="danger">{{ logoutError }}</AppInlineAlert>
    </div>

    <!-- Delete account -->
    <div class="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
      <div class="space-y-1">
        <div class="text-sm font-semibold text-red-800 dark:text-red-300">Delete account</div>
        <p class="text-xs text-red-700 dark:text-red-400 leading-relaxed">
          This signs you out immediately and schedules your account for deletion in 30 days.
          Log back in before then to cancel.
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

    <!-- Confirmation dialog: type DELETE to confirm -->
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
          This will hide your profile, sign you out everywhere, and schedule permanent
          anonymization for 30 days from now. You can cancel by logging back in before then.
        </p>

        <div class="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3 text-xs leading-relaxed text-red-800 dark:text-red-300">
          To continue, type <span class="font-mono font-semibold">DELETE</span> below.
        </div>

        <AppFormField label="Confirmation" helper="Type DELETE exactly">
          <InputText
            v-model="deleteConfirm"
            class="w-full font-mono"
            placeholder="DELETE"
            :disabled="deleting"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="characters"
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

const { deleting, error: deleteError, deleteAccount } = useDeleteAccount()
const { logoutEverywhere } = useAuth()
const { confirm } = useAppConfirm()

const confirmVisible = ref(false)
useOverlayDismiss(confirmVisible, () => (confirmVisible.value = false))
const deleteConfirm = ref('')
const reason = ref('')
const details = ref('')
const loggingOutEverywhere = ref(false)
const logoutError = ref('')

const requiredConfirmation = 'DELETE'

const canSubmit = computed(() => {
  return deleteConfirm.value.trim() === requiredConfirmation && !deleting.value
})

function onDialogHide() {
  if (deleting.value) return
  deleteConfirm.value = ''
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

async function requestLogoutEverywhere() {
  const ok = await confirm({
    header: 'Log out on all devices?',
    message: "This will end your session on every browser, phone, and tablet. You'll need to log in again.",
    confirmLabel: 'Log out everywhere',
    confirmSeverity: 'secondary',
    confirmIcon: 'tabler:devices-off',
  })
  if (!ok) return
  loggingOutEverywhere.value = true
  logoutError.value = ''
  try {
    await logoutEverywhere()
  } catch {
    logoutError.value = 'Could not confirm logout on all devices. Please try again.'
  } finally {
    loggingOutEverywhere.value = false
  }
}
</script>
