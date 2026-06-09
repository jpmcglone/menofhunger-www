<template>
  <div class="space-y-6">
    <div v-if="showDivider" class="border-t moh-border pt-6 -mt-2">
      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
        Verification
      </div>
    </div>
    <div class="rounded-xl border moh-border p-3 moh-surface space-y-2 text-sm">
      <div class="flex items-center justify-between gap-3">
        <div class="font-semibold text-gray-900 dark:text-gray-50">Your verification</div>
        <AppVerifiedBadge
          :status="authUser?.verifiedStatus ?? 'none'"
          :premium="Boolean(authUser?.premium)"
          :premium-plus="Boolean(authUser?.premiumPlus)"
          :is-organization="Boolean((authUser as any)?.isOrganization)"
          :steward-badge-enabled="authUser?.stewardBadgeEnabled ?? true"
        />
      </div>

      <div class="flex items-center justify-between gap-3">
        <div class="moh-text-muted">Status</div>
        <div class="text-sm">
          <Tag :value="verificationStatusLabel" :severity="verificationStatusSeverity" class="!text-xs" />
        </div>
      </div>

      <div class="flex items-center justify-between gap-3">
        <div class="moh-text-muted">Verified at</div>
        <div class="font-mono text-xs">{{ verifiedAtLabel }}</div>
      </div>

      <div v-if="verificationLatestRequest" class="pt-2 space-y-2">
        <div class="text-xs moh-text-muted">Latest request</div>

        <div class="flex items-center justify-between gap-3">
          <div class="moh-text-muted">Request status</div>
          <Tag :value="requestStatusLabel" :severity="requestStatusSeverity" class="!text-xs" />
        </div>

        <div class="flex items-center justify-between gap-3">
          <div class="moh-text-muted">Submitted</div>
          <div class="font-mono text-xs">{{ requestSubmittedAtLabel }}</div>
        </div>

        <div v-if="verificationLatestRequest.reviewedAt" class="flex items-center justify-between gap-3">
          <div class="moh-text-muted">Reviewed</div>
          <div class="font-mono text-xs">{{ requestReviewedAtLabel }}</div>
        </div>

        <div v-if="verificationLatestRequest.rejectionReason" class="space-y-1">
          <div class="text-xs moh-text-muted">Reason</div>
          <div class="text-sm moh-text">{{ verificationLatestRequest.rejectionReason }}</div>
        </div>
      </div>
    </div>

    <AppInlineAlert v-if="verificationError" severity="danger">
      {{ verificationError }}
    </AppInlineAlert>

    <!-- Already verified -->
    <div
      v-if="(authUser?.verifiedStatus ?? 'none') !== 'none'"
      class="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/8 px-3 py-2.5 text-sm"
    >
      <Icon name="tabler:rosette-discount-check" class="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
      <span class="moh-text">You’re verified. Thanks for being part of Men of Hunger.</span>
    </div>

    <!-- Pending request -->
    <div
      v-else-if="verificationLatestRequest?.status === 'pending'"
      class="flex items-start gap-2 rounded-lg border border-yellow-300 bg-yellow-50 dark:border-yellow-500/25 dark:bg-yellow-500/8 px-3 py-2.5 text-sm"
    >
      <Icon name="tabler:clock" class="mt-0.5 shrink-0 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
      <span class="moh-text">
        Verification requested <span class="font-medium">{{ requestSubmittedAtLabel }}</span>. We’ll review it soon — no action needed.
      </span>
    </div>

    <!-- Request CTA -->
    <div v-else class="flex flex-wrap items-center gap-3">
      <Button
        label="Request Verification"
        :disabled="verificationStarting"
        @click="verificationConfirmVisible = true"
      >
        <template #icon>
          <Icon name="tabler:id-badge" aria-hidden="true" />
        </template>
      </Button>
    </div>

    <div v-if="(authUser?.verifiedStatus ?? 'none') === 'none' && verificationLatestRequest?.status !== 'pending'" class="text-xs moh-text-muted">
      An admin will review your request manually. You’ll see your verified badge once it’s approved.
    </div>

    <AppConfirmDialog
      v-model:visible="verificationConfirmVisible"
      header="Request Verification?"
      message="This sends a verification request to the Men of Hunger team. An admin will review your account and approve or reject it. You can only have one open request at a time."
      cancel-label="Not now"
      confirm-label="Submit request"
      confirm-severity="primary"
      confirm-icon="tabler:id-badge"
      :loading="verificationStarting"
      @confirm="confirmStartVerification()"
    />

    <div
      v-if="authUser?.premiumPlus"
      class="rounded-xl border moh-border p-3 moh-surface space-y-3 text-sm"
    >
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-1">
          <div class="font-semibold text-gray-900 dark:text-gray-50">Steward badge</div>
          <div class="text-xs moh-text-muted">
            Show a Steward (Premium+) badge next to your verified badge across the app.
          </div>
        </div>
        <Checkbox
          v-model="stewardBadgeEnabledInput"
          binary
          input-id="moh-steward-badge-enabled"
          :disabled="stewardBadgeSaving"
        />
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <AppSaveButton severity="secondary" :loading="stewardBadgeSaving" :disabled="!stewardBadgeDirty" @click="saveStewardBadge" />
        <div v-if="stewardBadgeSaved" class="text-sm text-green-700 dark:text-green-300">Saved.</div>
      </div>

      <AppInlineAlert v-if="stewardBadgeError" severity="danger">{{ stewardBadgeError }}</AppInlineAlert>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MyVerificationStatus, VerificationRequestPublic } from '~/types/api'
import type { AuthUser } from '~/composables/useAuth'
import { useFormSave } from '~/composables/useFormSave'
import { useFormSubmit } from '~/composables/useFormSubmit'
import { useSyncUserCaches } from '~/composables/settings/useSyncUserCaches'
import { getApiErrorMessage } from '~/utils/api-error'
import { formatDateTime } from '~/utils/time-format'

withDefaults(defineProps<{
  /** Show the "Verification" sub-heading divider (used when composed with other blocks). */
  showDivider?: boolean
}>(), { showDivider: false })

const { user: authUser } = useAuth()
const { apiFetchData } = useApiClient()
const syncUserCaches = useSyncUserCaches()

const verificationRefreshing = ref(false)
const verificationError = ref<string | null>(null)
const verificationLatestRequest = ref<VerificationRequestPublic | null>(null)

async function refreshVerification() {
  if (verificationRefreshing.value) return
  verificationRefreshing.value = true
  verificationError.value = null
  try {
    const res = await apiFetchData<MyVerificationStatus>('/verification/me', { method: 'GET' })
    verificationLatestRequest.value = res.latestRequest ?? null

    // Keep auth state fresh (useful right after manual approval).
    if (authUser.value) {
      authUser.value = {
        ...authUser.value,
        verifiedStatus: res.verifiedStatus,
        verifiedAt: res.verifiedAt,
        unverifiedAt: res.unverifiedAt,
      }
    }
  } catch (e: unknown) {
    verificationError.value = getApiErrorMessage(e) || 'Failed to load verification status.'
  } finally {
    verificationRefreshing.value = false
  }
}

// Refresh whenever the section mounts so the badge/status reflects any
// out-of-band changes (e.g. an admin approved while the user was elsewhere).
onMounted(() => {
  void refreshVerification()
})

// AppConfirmDialog closes itself on confirm — no need to toggle visibility here.
const verificationConfirmVisible = ref(false)

const { submit: startVerification, submitting: verificationStarting } = useFormSubmit(
  async () => {
    verificationError.value = null
    const req = await apiFetchData<VerificationRequestPublic>('/verification/request', {
      method: 'POST',
      body: {},
    })
    verificationLatestRequest.value = req
  },
  {
    defaultError: 'Failed to start verification.',
    onError: (message) => {
      verificationError.value = message
    },
  },
)

function confirmStartVerification() {
  void startVerification()
}

const verificationStatusLabel = computed(() => {
  const s = authUser.value?.verifiedStatus ?? 'none'
  if (s === 'identity') return 'Identity verified'
  if (s === 'manual') return 'Manually verified'
  return 'Not verified'
})

const verificationStatusSeverity = computed(() => {
  const s = authUser.value?.verifiedStatus ?? 'none'
  if (s === 'identity' || s === 'manual') return 'info'
  return 'secondary'
})

const verifiedAtLabel = computed(() => formatDateTime(authUser.value?.verifiedAt, { fallback: '—' }))

const requestStatusLabel = computed(() => {
  const s = verificationLatestRequest.value?.status
  if (s === 'approved') return 'Approved'
  if (s === 'rejected') return 'Rejected'
  if (s === 'cancelled') return 'Cancelled'
  return 'Pending'
})

const requestStatusSeverity = computed(() => {
  const s = verificationLatestRequest.value?.status
  if (s === 'approved') return 'success'
  if (s === 'rejected') return 'danger'
  if (s === 'cancelled') return 'secondary'
  return 'warning'
})

const requestSubmittedAtLabel = computed(() => formatDateTime(verificationLatestRequest.value?.createdAt, { fallback: '—' }))
const requestReviewedAtLabel = computed(() => formatDateTime(verificationLatestRequest.value?.reviewedAt, { fallback: '—' }))

// Premium+ steward badge toggle
const stewardBadgeEnabledInput = ref<boolean>(true)
const stewardBadgeError = ref<string | null>(null)

watch(
  () => authUser.value?.stewardBadgeEnabled,
  (v) => {
    // ON by default when field is missing (defensive).
    stewardBadgeEnabledInput.value = v !== false
  },
  { immediate: true },
)

const stewardBadgeDirty = computed(() => (authUser.value?.stewardBadgeEnabled ?? true) !== stewardBadgeEnabledInput.value)

const { save: saveStewardBadgeRequest, saving: stewardBadgeSaving, saved: stewardBadgeSaved } = useFormSave(
  async () => {
    const previousUsername = authUser.value?.username ?? null
    const result = await apiFetchData<{ user: AuthUser }>('/users/me/settings', {
      method: 'PATCH',
      body: { stewardBadgeEnabled: stewardBadgeEnabledInput.value },
    })
    authUser.value = result.user ?? authUser.value
    syncUserCaches(result.user, previousUsername)
  },
  {
    defaultError: 'Failed to save steward badge.',
    onError: (message) => {
      stewardBadgeError.value = message
    },
  },
)

async function saveStewardBadge() {
  stewardBadgeError.value = null
  stewardBadgeSaved.value = false
  await saveStewardBadgeRequest()
}
</script>
