<template>
  <div class="space-y-6">
    <div v-if="showDivider" class="border-t moh-border pt-6 -mt-2">
      <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
        Verification
      </div>
    </div>
    <section class="space-y-5">
      <div>
        <h2 class="text-xl sm:text-2xl font-bold tracking-tight">{{ isVerified ? 'You’re verified' : verificationLatestRequest?.status === 'pending' ? 'Your request is in' : 'Your next step: verification' }}</h2>
        <p class="mt-2 moh-text-muted">{{ isVerified ? 'Your verified badge is now part of your profile.' : verificationLatestRequest?.status === 'pending' ? 'An admin will contact you here to arrange your verification video call.' : 'Put a real person behind your profile. Meet an admin in a video call, right here on Men of Hunger.' }}</p>
      </div>
      <div class="flex items-center gap-3 rounded-2xl moh-surface-2 p-4">
        <AppUserAvatar v-if="authUser" :user="authUser" size-class="h-10 w-10" :show-status="false" />
        <div class="min-w-0">
          <div class="flex items-center gap-2"><strong class="truncate">{{ authUser?.name || authUser?.username }}</strong><AppVerifiedBadge :status="isVerified ? authUser?.verifiedStatus ?? 'none' : 'manual'" /></div>
          <p class="text-sm moh-text-muted">@{{ authUser?.username }}</p>
        </div>
      </div>
      <p v-if="!isVerified" class="text-xs moh-text-muted">A preview of your verified profile</p>
      <template v-if="!isVerified && verificationLatestRequest?.status !== 'pending'">
        <h3 class="font-semibold">More ways to take part</h3>
        <ul class="space-y-3">
          <li v-for="benefit in ['A blue check beside your name', 'Take part in verified conversations', 'Connect with other verified members']" :key="benefit" class="flex gap-3">
            <AppIconGlyph name="check" :size="20" class="shrink-0 text-[var(--moh-verified)]" /><span>{{ benefit }}</span>
          </li>
        </ul>
      </template>
    </section>


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
        Verification requested <span class="font-medium">{{ requestSubmittedAtLabel }}</span>. An admin will contact you here to arrange your video call. You can keep using the app while you wait.
      </span>
    </div>

    <form v-else class="space-y-4" @submit.prevent="confirmStartVerification">
      <label class="flex min-h-11 cursor-pointer items-start gap-3">
        <input v-model="videoCallConsent" type="checkbox" class="mt-1 h-6 w-6 shrink-0" :disabled="verificationStarting">
        <span>I want to get verified, and I’m willing to join a video call with a Men of Hunger admin here in the app.</span>
      </label>
      <AppActionButton type="submit" label="Request verification" class="w-full" :disabled="!videoCallConsent || verificationRefreshing" :loading="verificationStarting" />
      <p class="text-xs moh-text-muted">Verification is complete after an admin approves it.</p>
    </form>

    <NuxtLink
      v-if="isVerified || verificationLatestRequest?.status === 'pending'"
      :to="isVerified ? `/u/${authUser?.username}` : '/home'"
      class="flex min-h-11 w-full items-center justify-center rounded-full px-5 py-3 text-sm font-semibold bg-[var(--moh-button-primary-fill)] text-[var(--moh-button-primary-label)] moh-focus"
    >{{ isVerified ? 'View your profile' : 'Back to the lodge' }}</NuxtLink>

    <details class="text-sm" :open="(authUser?.verifiedStatus ?? 'none') !== 'none'">
      <summary class="min-h-11 cursor-pointer py-3 font-semibold">Verification details</summary>
    <div class="rounded-xl border moh-border p-3 moh-surface space-y-2 text-sm">
      <div class="flex items-center justify-between gap-3">
        <div class="font-semibold text-gray-900 dark:text-gray-50">Your verification</div>
        <AppVerifiedBadge
          :status="authUser?.verifiedStatus ?? 'none'"
          :premium="Boolean(authUser?.premium)"
          :premium-plus="Boolean(authUser?.premiumPlus)"
          :is-organization="Boolean((authUser as any)?.isOrganization)"
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

    </details>

  </div>
</template>

<script setup lang="ts">
import type { MyVerificationStatus, VerificationRequestPublic } from '~/types/api'
import { useFormSubmit } from '~/composables/useFormSubmit'
import { getApiErrorMessage } from '~/utils/api-error'
import { formatDateTime } from '~/utils/time-format'

withDefaults(defineProps<{
  /** Show the "Verification" sub-heading divider (used when composed with other blocks). */
  showDivider?: boolean
}>(), { showDivider: false })

const isVerified = computed(() => (authUser.value?.verifiedStatus ?? 'none') !== 'none')

const { user: authUser } = useAuth()
const { apiFetchData } = useApiClient()

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

watch(() => authUser.value?.verifiedStatus, () => { void refreshVerification() })

// Refresh whenever the section mounts so the badge/status reflects any
// out-of-band changes (e.g. an admin approved while the user was elsewhere).
onMounted(() => {
  void refreshVerification()
})

const videoCallConsent = ref(false)

const { submit: startVerification, submitting: verificationStarting } = useFormSubmit(
  async () => {
    verificationError.value = null
    const req = await apiFetchData<VerificationRequestPublic>('/verification/request', {
      method: 'POST',
      body: { videoCallConsent: true },
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
  if (!videoCallConsent.value || verificationRefreshing.value) return
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
</script>
