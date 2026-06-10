<template>
  <Card v-if="showCard" class="moh-card moh-card-matte !rounded-2xl overflow-hidden">
    <template #title>
      <div class="flex items-center justify-between gap-2">
        <NuxtLink to="/referrals" class="moh-h2 hover:underline">Referrals</NuxtLink>
        <NuxtLink to="/referrals" aria-label="View referrals" tabindex="-1">
          <Icon
            name="tabler:gift"
            class="transition-colors duration-350 ease-in-out"
            :class="onReferralsPage ? 'text-gray-400 dark:text-zinc-500' : 'text-[var(--moh-premium)]'"
            aria-hidden="true"
          />
        </NuxtLink>
      </div>
    </template>

    <template #content>
      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-3 animate-pulse py-1" aria-hidden="true">
        <div class="h-4 rounded-full bg-gray-200 dark:bg-zinc-800 w-3/4" />
        <div class="h-16 rounded-xl bg-gray-200 dark:bg-zinc-800" />
        <div class="h-9 rounded-xl bg-gray-200 dark:bg-zinc-800" />
        <div class="h-4 rounded-full bg-gray-200 dark:bg-zinc-800 w-28" />
      </div>

      <div v-else-if="referralData" class="space-y-3">
        <!-- Value prop -->
        <p class="text-xs leading-relaxed moh-text-muted" style="text-wrap: pretty">
          You and your referral get <span class="font-semibold moh-text">1 month free</span> after their first premium payment.
        </p>

        <!-- ─── Has code ─────────────────────────────────────────────────── -->
        <template v-if="referralCode">
          <!-- Tap-to-copy code block -->
          <button
            type="button"
            class="w-full rounded-xl px-4 py-3 text-center select-none active:scale-[0.96]
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 border"
            :class="onReferralsPage
              ? 'bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 focus-visible:ring-gray-400'
              : 'bg-[var(--moh-premium)] border-transparent focus-visible:ring-[var(--moh-premium)]'"
            style="transition: background-color 0.35s ease, border-color 0.35s ease, transform 0.1s ease"
            :aria-label="copied ? 'Copied!' : 'Copy referral link'"
            @click="copyShareLink"
          >
            <div
              class="text-[10px] font-semibold uppercase tracking-wide transition-colors duration-350 ease-in-out"
              :class="onReferralsPage ? 'text-gray-500 dark:text-zinc-400' : 'text-white/70'"
            >
              Your code
            </div>
            <div class="flex items-center justify-center gap-2 mt-1">
              <div
                class="font-mono font-black tracking-[0.16em] leading-tight transition-colors duration-350 ease-in-out"
                :class="onReferralsPage ? 'text-gray-900 dark:text-white' : 'text-white'"
                :style="{ fontSize: codeFontSize }"
              >
                {{ referralCode }}
              </div>
              <!-- Icon cross-fade: copy ↔ check -->
              <div class="relative shrink-0 w-4 h-4">
                <Icon
                  name="tabler:copy"
                  class="absolute inset-0 transition-[opacity,scale,filter,color] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
                  :class="onReferralsPage ? 'text-gray-400 dark:text-zinc-500' : 'text-white/70'"
                  :style="{ opacity: copied ? 0 : 1, scale: copied ? '0.25' : '1', filter: copied ? 'blur(4px)' : 'none' }"
                  aria-hidden="true"
                />
                <Icon
                  name="tabler:check"
                  class="absolute inset-0 transition-[opacity,scale,filter,color] duration-200 ease-[cubic-bezier(0.2,0,0,1)]"
                  :class="onReferralsPage ? 'text-gray-600 dark:text-zinc-300' : 'text-white'"
                  :style="{ opacity: copied ? 1 : 0, scale: copied ? '1' : '0.25', filter: copied ? 'none' : 'blur(4px)' }"
                  aria-hidden="true"
                />
              </div>
            </div>
          </button>

          <!-- Share CTA -->
          <Button
            :label="copied ? 'Copied!' : 'Share invite'"
            class="w-full active:scale-[0.96] transition-transform duration-100"
            severity="contrast"
            @click="shareReferral"
          />

          <!-- Progress line + pilot earnings -->
          <div class="space-y-1.5">
            <component
              :is="onReferralsPage ? 'span' : NuxtLink"
              to="/referrals"
              class="flex items-center justify-between text-xs moh-text-muted transition-colors group"
              :class="{ 'hover:moh-text': !onReferralsPage }"
            >
              <span class="tabular-nums">
                <template v-if="recruitCount > 0">
                  {{ recruitCount }} joined<template v-if="pilotPremiumCount !== null"> · {{ pilotPremiumCount }} Premium</template>
                </template>
                <template v-else>
                  View your referrals
                </template>
              </span>
              <Icon
                v-if="!onReferralsPage"
                name="tabler:chevron-right"
                class="text-[10px] moh-text-muted group-hover:translate-x-0.5 transition-transform duration-150"
                aria-hidden="true"
              />
            </component>

            <!-- Referral Pilot earnings row (pilot members only) -->
            <NuxtLink
              v-if="pilotPendingCents !== null"
              to="/referrals"
              class="flex items-center justify-between text-xs group hover:opacity-80 transition-opacity"
            >
              <span
                class="flex items-center gap-1.5 transition-colors duration-350 ease-in-out"
                :class="onReferralsPage ? 'moh-text-muted' : 'text-[var(--moh-premium)]'"
              >
                <Icon name="tabler:coins" class="text-sm shrink-0" aria-hidden="true" />
                <span class="tabular-nums font-semibold">{{ formatCents(pilotPendingCents) }} pending</span>
                <span class="moh-text-muted font-normal">· Referral Pilot</span>
              </span>
              <Icon
                name="tabler:chevron-right"
                class="text-[10px] moh-text-muted group-hover:translate-x-0.5 transition-transform duration-150"
                aria-hidden="true"
              />
            </NuxtLink>
          </div>
        </template>

        <!-- ─── No code yet ────────────────────────────────────────────── -->
        <template v-else>
          <div>
            <div class="text-sm font-semibold moh-text">Claim your code</div>
            <p class="mt-1 text-xs leading-relaxed moh-text-muted">
              Friends use it when they join — you both get a month free.
            </p>
          </div>

          <Button
            as="NuxtLink"
            to="/referrals"
            label="Set up referrals"
            class="w-full active:scale-[0.96] transition-transform duration-100"
            severity="contrast"
          />
        </template>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import type { ReferralMe, AffiliateSummary } from '~/types/api'
import type { ReferralCallback } from '~/composables/presence/types'
import { getApiErrorMessage } from '~/utils/api-error'

const NuxtLink = resolveComponent('NuxtLink')
const route = useRoute()
const onReferralsPage = computed(() => route.path === '/referrals')

const { user, isAuthed } = useAuth()
const { apiFetchData } = useApiClient()
const { addReferralCallback, removeReferralCallback } = usePresence()
const { referralCode: sharedCode, setReferralCode } = useReferralCode()

const referralData = ref<ReferralMe | null>(null)
const affiliateData = ref<AffiliateSummary | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const showCard = computed(() => {
  const u = user.value
  return Boolean(isAuthed.value && (u?.premium || u?.premiumPlus))
})

// Prefer the shared state (updated instantly by the /referrals page); fall back to local fetch result.
const referralCode = computed(() => {
  if (sharedCode.value !== undefined) return sharedCode.value ?? ''
  return (referralData.value?.referralCode ?? '').trim()
})
const recruitCount = computed(() => referralData.value?.recruitCount ?? 0)

// Pilot-only derived values — null means not a pilot member
const pilotPendingCents = computed<number | null>(() => {
  const a = affiliateData.value
  if (!a?.isAffiliate) return null
  return a.pendingCents
})

const pilotPremiumCount = computed<number | null>(() => {
  const a = affiliateData.value
  if (!a?.isAffiliate) return null
  return a.counts.premium + a.counts.premium60d
})

const codeFontSize = computed(() => {
  const len = referralCode.value.length
  if (len <= 6) return '1.5rem'
  if (len <= 10) return '1.25rem'
  if (len <= 14) return '1rem'
  if (len <= 17) return '0.875rem'
  return '0.75rem'
})

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

// ─── Data loading ─────────────────────────────────────────────────────────────

async function refresh() {
  if (!showCard.value || loading.value) return
  loading.value = true
  error.value = null
  try {
    const [referral, affiliate] = await Promise.all([
      apiFetchData<ReferralMe>('/billing/referral', { method: 'GET' }),
      apiFetchData<AffiliateSummary>('/billing/affiliate', { method: 'GET' }),
    ])
    referralData.value = referral
    setReferralCode(referral.referralCode ?? null)
    affiliateData.value = affiliate
  } catch (e: unknown) {
    error.value = getApiErrorMessage(e) || 'Failed to load referrals.'
  } finally {
    loading.value = false
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

async function copyShareLink() {
  const url = shareUrl.value
  if (!url || !import.meta.client) return
  try {
    await navigator.clipboard?.writeText(url)
    setCopied()
  } catch {
    error.value = 'Could not copy link.'
  }
}

async function shareReferral() {
  const url = shareUrl.value
  if (!url || !import.meta.client) return
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Join Men of Hunger', text: shareMessage.value, url })
    } catch { /* user cancelled */ }
    return
  }
  try {
    await navigator.clipboard?.writeText(`${shareMessage.value}\n\n${url}`)
    setCopied()
  } catch {
    error.value = 'Could not copy share message.'
  }
}

function setCopied() {
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { copied.value = false; copiedTimer = null }, 1800)
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

const referralCb: ReferralCallback = {
  onRecruitUpdated() {
    // A recruit reached a new milestone — bump local count and re-fetch to stay accurate.
    if (referralData.value) {
      referralData.value = {
        ...referralData.value,
        recruitCount: referralData.value.recruitCount + 1,
      }
    }
    void apiFetchData<ReferralMe>('/billing/referral', { method: 'GET' })
      .then((data) => { referralData.value = data })
      .catch(() => undefined)
    if (affiliateData.value?.isAffiliate) {
      void apiFetchData<AffiliateSummary>('/billing/affiliate', { method: 'GET' })
        .then((data) => { affiliateData.value = data })
        .catch(() => undefined)
    }
  },
}

watch(showCard, (show) => {
  if (show && !referralData.value) void refresh()
}, { immediate: true })

onMounted(() => { addReferralCallback(referralCb) })
onBeforeUnmount(() => {
  removeReferralCallback(referralCb)
  if (copiedTimer) clearTimeout(copiedTimer)
})
</script>
