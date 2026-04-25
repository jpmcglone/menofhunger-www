<template>
  <Card v-if="showCard" class="moh-card moh-card-matte !rounded-2xl">
    <template #title>
      <div class="flex items-center justify-between gap-2">
        <span class="moh-h2">Invite friends</span>
        <Icon name="tabler:gift" class="text-[var(--moh-premium)]" aria-hidden="true" />
      </div>
    </template>

    <template #content>
      <div v-if="loading" class="space-y-3 animate-pulse py-1" aria-hidden="true">
        <div class="h-4 rounded-full bg-gray-200 dark:bg-zinc-800 w-3/4" />
        <div class="h-9 rounded-xl bg-gray-200 dark:bg-zinc-800" />
        <div class="h-8 rounded-full bg-gray-200 dark:bg-zinc-800 w-28" />
      </div>

      <div v-else-if="billingMe" class="space-y-3">
        <p class="text-xs leading-relaxed moh-text-muted">
          You and your referral get <span class="font-semibold moh-text">1 month free</span> after their first successful premium purchase.
        </p>

        <template v-if="referralCode">
          <div class="rounded-2xl border moh-border bg-[rgba(var(--moh-premium-rgb),0.07)] px-4 py-3 text-center dark:bg-[rgba(var(--moh-premium-rgb),0.12)]">
            <div class="text-[10px] font-semibold uppercase tracking-wide moh-text-muted">Your code</div>
            <div class="mt-1 font-mono text-2xl font-black tracking-[0.16em] text-[var(--moh-premium)]">
              {{ referralCode }}
            </div>
          </div>

          <div class="rounded-xl border moh-border px-3 py-2 text-xs moh-text-muted truncate">
            {{ shareUrl }}
          </div>

          <div class="grid grid-cols-2 gap-2">
            <Button
              :label="copied ? 'Copied' : 'Copy link'"
              size="small"
              severity="secondary"
              outlined
              :disabled="copied"
              @click="copyShareLink"
            />
            <Button
              label="Share"
              size="small"
              severity="contrast"
              @click="shareReferral"
            />
          </div>
        </template>

        <template v-else>
          <div>
            <div class="text-sm font-semibold moh-text">Set yours now.</div>
            <p class="mt-1 text-xs leading-relaxed moh-text-muted">
              Pick a short code your friends can use when they join.
            </p>
          </div>

          <div class="flex gap-2">
            <InputText
              v-model="referralCodeDraft"
              class="min-w-0 flex-1 font-mono"
              placeholder="YOURNAME"
              spellcheck="false"
              autocomplete="off"
              maxlength="20"
              :disabled="saving"
              @keydown.enter.prevent="saveReferralCode"
            />
            <Button
              label="Set"
              :loading="saving"
              :disabled="!referralCodeDraft.trim() || saving"
              @click="saveReferralCode"
            />
          </div>

          <AppInlineAlert v-if="error" severity="danger">
            {{ error }}
          </AppInlineAlert>
          <p class="text-[11px] moh-text-muted">4-20 characters. Letters, numbers, hyphens, underscores.</p>
        </template>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import type { BillingMe } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const { user, isAuthed } = useAuth()
const { apiFetchData } = useApiClient()

const billingMe = ref<BillingMe | null>(null)
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const referralCodeDraft = ref('')
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const showCard = computed(() => {
  const u = user.value
  return Boolean(isAuthed.value && (u?.premium || u?.premiumPlus))
})

const referralCode = computed(() => (billingMe.value?.referralCode ?? '').trim())
const shareUrl = computed(() => {
  const code = referralCode.value
  if (!code) return ''
  const origin = import.meta.client ? window.location.origin : ''
  return `${origin}/?ref=${encodeURIComponent(code)}`
})
const shareMessage = computed(() => {
  const code = referralCode.value
  if (!code) return 'Join me on Men of Hunger.'
  return `Join me on Men of Hunger. Use my code ${code} and we'll both get 1 month free when you go Premium.`
})
const shareText = computed(() => {
  const url = shareUrl.value
  return url ? `${shareMessage.value}\n\n${url}` : shareMessage.value
})

async function refreshBilling() {
  if (!showCard.value || loading.value) return
  loading.value = true
  error.value = null
  try {
    billingMe.value = await apiFetchData<BillingMe>('/billing/me', { method: 'GET' })
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load referrals.'
  } finally {
    loading.value = false
  }
}

async function saveReferralCode() {
  const code = referralCodeDraft.value.trim()
  if (!code || saving.value) return
  saving.value = true
  error.value = null
  try {
    const res = await apiFetchData<{ referralCode: string }>('/billing/referral/code', {
      method: 'PUT',
      body: { code },
    })
    billingMe.value = {
      ...(billingMe.value as BillingMe),
      referralCode: res.referralCode,
    }
    referralCodeDraft.value = ''
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to save referral code.'
  } finally {
    saving.value = false
  }
}

async function copyShareLink() {
  const url = shareUrl.value
  if (!url || !import.meta.client) return
  try {
    await navigator.clipboard?.writeText(url)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
      copiedTimer = null
    }, 1800)
  } catch {
    error.value = 'Could not copy link.'
  }
}

async function shareReferral() {
  const url = shareUrl.value
  if (!url || !import.meta.client) return
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Join Men of Hunger',
        text: shareMessage.value,
        url,
      })
      return
    } catch {
      return
    }
  }
  try {
    await navigator.clipboard?.writeText(shareText.value)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
      copiedTimer = null
    }, 1800)
  } catch {
    error.value = 'Could not copy share message.'
  }
}

watch(showCard, (show) => {
  if (show && !billingMe.value) void refreshBilling()
}, { immediate: true })

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})
</script>
