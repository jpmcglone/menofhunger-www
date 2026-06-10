<template>
  <AppPageContent bottom="standard">
    <!-- Header -->
    <div class="moh-gutter-x border-b moh-border pt-4 pb-4">
      <h1 class="moh-h1" style="text-wrap: balance">Referrals</h1>
      <p class="mt-1 text-sm moh-text-muted" style="text-wrap: pretty">
        Share your code — you both get 1 month Premium free when they go Premium.
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-px">
      <!-- hero skeleton -->
      <div class="moh-gutter-x py-5 space-y-3 animate-pulse">
        <div class="h-24 rounded-2xl bg-gray-200 dark:bg-zinc-800" />
        <div class="h-10 rounded-xl bg-gray-200 dark:bg-zinc-800" />
      </div>
    </div>

    <AppInlineAlert v-else-if="error" severity="danger" class="mx-4 mt-4">
      {{ error }}
    </AppInlineAlert>

    <template v-else>
      <!-- Not premium -->
      <div v-if="!isPremium" class="moh-gutter-x py-12 text-center space-y-3">
        <Icon name="tabler:gift" class="text-4xl text-[var(--moh-premium)]" aria-hidden="true" />
        <h2 class="text-lg font-semibold moh-text" style="text-wrap: balance">Premium required</h2>
        <p class="text-sm moh-text-muted max-w-xs mx-auto" style="text-wrap: pretty">
          Upgrade to Premium to claim a referral code and start earning free months.
        </p>
        <Button as="NuxtLink" to="/tiers" label="Upgrade to Premium" rounded class="mt-2" />
      </div>

      <template v-else>
        <!-- ─── Share hero ──────────────────────────────────────────────────── -->
        <section class="border-b moh-border">
          <div class="moh-gutter-x pt-5 pb-5 space-y-3">

            <!-- Editing existing code -->
            <template v-if="editingCode">
              <div class="text-sm font-semibold moh-text">Change your code</div>
              <div class="flex gap-2">
                <InputText
                  ref="claimCodeInputRef"
                  v-model="codeInput"
                  class="min-w-0 flex-1 font-mono"
                  placeholder="YOURNAME"
                  spellcheck="false"
                  autocomplete="off"
                  maxlength="20"
                  :disabled="savingCode"
                  @keydown="onEditKeydown"
                />
                <Button
                  label="Save"
                  :loading="savingCode"
                  :disabled="!codeInput.trim() || codeInput.trim().toUpperCase() === referralCode || savingCode"
                  @click="saveCode"
                />
                <Button
                  label="Cancel"
                  severity="secondary"
                  outlined
                  :disabled="savingCode"
                  @click="cancelEditCode"
                />
              </div>
              <AppInlineAlert v-if="codeError" severity="danger">{{ codeError }}</AppInlineAlert>
              <p class="text-xs moh-text-muted" style="text-wrap: pretty">
                4–20 characters. Letters, numbers, hyphens, underscores. Existing links with your old code will stop working.
              </p>
            </template>

            <!-- Has code -->
            <template v-else-if="referralCode">
              <!-- Tap-to-copy code block -->
              <button
                type="button"
                class="w-full rounded-2xl bg-[var(--moh-premium)] px-4 py-5 text-center select-none
                       active:scale-[0.96] transition-transform duration-100
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moh-premium)] focus-visible:ring-offset-2"
                :aria-label="copied ? 'Copied!' : 'Copy referral link'"
                @click="copyShareLink"
              >
                <div class="text-[10px] font-semibold uppercase tracking-wide text-white/70">Your code</div>
                <div class="flex items-center justify-center gap-2.5 mt-1">
                  <div
                    class="font-mono font-black tracking-[0.16em] text-white leading-tight"
                    :style="{ fontSize: codeFontSize }"
                  >
                    {{ referralCode }}
                  </div>
                  <!-- copy ↔ check cross-fade -->
                  <div class="relative shrink-0 w-5 h-5">
                    <Icon
                      name="tabler:copy"
                      class="absolute inset-0 text-white/70"
                      :style="{
                        opacity: copied ? 0 : 1,
                        scale: copied ? '0.25' : '1',
                        filter: copied ? 'blur(4px)' : 'none',
                        transition: 'opacity 0.2s cubic-bezier(0.2,0,0,1), scale 0.2s cubic-bezier(0.2,0,0,1), filter 0.2s cubic-bezier(0.2,0,0,1)',
                      }"
                      aria-hidden="true"
                    />
                    <Icon
                      name="tabler:check"
                      class="absolute inset-0 text-white"
                      :style="{
                        opacity: copied ? 1 : 0,
                        scale: copied ? '1' : '0.25',
                        filter: copied ? 'none' : 'blur(4px)',
                        transition: 'opacity 0.2s cubic-bezier(0.2,0,0,1), scale 0.2s cubic-bezier(0.2,0,0,1), filter 0.2s cubic-bezier(0.2,0,0,1)',
                      }"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div class="text-[11px] text-white/50 mt-1.5">
                  {{ copied ? 'Link copied!' : 'Tap to copy link' }}
                </div>
              </button>

              <!-- Share CTA -->
              <Button
                :label="copied ? 'Copied!' : 'Share invite'"
                class="w-full active:scale-[0.96] transition-transform duration-100"
                severity="contrast"
                @click="shareReferral"
              />

              <!-- Change code -->
              <button
                type="button"
                class="text-xs moh-text-muted hover:moh-text transition-colors"
                @click="startEditCode"
              >
                Change code →
              </button>
            </template>

            <!-- No code yet -->
            <template v-else>
              <div>
                <div class="text-sm font-semibold moh-text">Claim your code</div>
                <p class="mt-1 text-xs moh-text-muted" style="text-wrap: pretty">
                  Friends enter it when they join — you both get a free month when they go Premium.
                </p>
              </div>
              <div class="flex gap-2">
                <InputText
                  ref="claimCodeInputRef"
                  v-model="codeInput"
                  class="min-w-0 flex-1 font-mono"
                  placeholder="YOURNAME"
                  spellcheck="false"
                  autocomplete="off"
                  maxlength="20"
                  :disabled="savingCode"
                  @keydown.enter.prevent="saveCode"
                />
                <Button
                  label="Set"
                  :loading="savingCode"
                  :disabled="!codeInput.trim() || savingCode"
                  @click="saveCode"
                />
              </div>
              <AppInlineAlert v-if="codeError" severity="danger">{{ codeError }}</AppInlineAlert>
              <p class="text-xs moh-text-muted">4–20 characters. Letters, numbers, hyphens, underscores.</p>
            </template>
          </div>
        </section>

        <!-- ─── Pilot earnings (pilot members only) ────────────────────────── -->
        <section v-if="affiliate?.isAffiliate" class="border-b moh-border">
          <div class="moh-gutter-x pt-5 pb-5 space-y-4">

            <!-- Cap reached: celebration banner -->
            <div
              v-if="affiliate.capReached"
              class="rounded-2xl bg-[var(--moh-premium)] p-5 text-center space-y-1.5"
            >
              <div class="text-2xl">🎉</div>
              <div class="text-base font-bold text-white" style="text-wrap: balance">You maxed out the pilot!</div>
              <div class="text-sm text-white/80" style="text-wrap: pretty">
                You've earned the full ${{ (affiliate.capCents / 100).toFixed(0) }} cap. Incredible work bringing serious men into Men of Hunger.
              </div>
            </div>

            <!-- Section title -->
            <div class="flex items-center gap-2">
              <Icon name="tabler:coins" class="text-[var(--moh-premium)] text-lg shrink-0" aria-hidden="true" />
              <span class="text-sm font-semibold moh-text">Referral Pilot earnings</span>
            </div>

            <!-- Pending + Settled cards -->
            <div class="grid grid-cols-2 gap-3">
              <!-- Pending -->
              <div class="rounded-xl border moh-border moh-surface p-4 space-y-2">
                <div class="text-xs moh-text-muted uppercase tracking-wide">Pending</div>
                <div
                  class="text-xl font-bold tabular-nums"
                  :class="affiliate.pendingCents >= affiliate.minPayoutCents ? 'moh-text' : 'moh-text-muted opacity-50'"
                >
                  {{ formatCents(affiliate.pendingCents) }}
                </div>
                <!-- Progress toward min payout or cap -->
                <div class="space-y-1">
                  <div class="h-1 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                    <div
                      class="h-full rounded-full transition-[width] duration-500"
                      :class="affiliate.pendingCents >= affiliate.minPayoutCents ? 'bg-[var(--moh-premium)]' : 'bg-gray-400 dark:bg-zinc-500'"
                      :style="{ width: `${pendingProgressPct}%` }"
                    />
                  </div>
                  <div class="text-[10px] moh-text-muted tabular-nums leading-tight">
                    <template v-if="affiliate.pendingCents < affiliate.minPayoutCents">
                      {{ formatCents(affiliate.minPayoutCents - affiliate.pendingCents) }} until payout
                    </template>
                    <template v-else>
                      Ready to cash out
                    </template>
                  </div>
                </div>
              </div>

              <!-- Settled -->
              <div class="rounded-xl border moh-border moh-surface p-4 space-y-1">
                <div class="text-xs moh-text-muted uppercase tracking-wide">Settled</div>
                <div class="text-xl font-bold moh-text tabular-nums">{{ formatCents(affiliate.settledCents) }}</div>
                <div class="text-[10px] moh-text-muted">Total paid out</div>
              </div>
            </div>

            <!-- Milestone counts -->
            <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs moh-text-muted tabular-nums">
              <span>Signups: <span class="font-semibold moh-text">{{ affiliate.counts.signups }}</span></span>
              <span>Verified: <span class="font-semibold moh-text">{{ affiliate.counts.verified }}</span></span>
              <span>Premium: <span class="font-semibold moh-text">{{ affiliate.counts.premium }}</span></span>
              <span>60-day: <span class="font-semibold moh-text">{{ affiliate.counts.premium60d }}</span></span>
            </div>

            <!-- How payouts work — collapsed by default -->
            <details class="group rounded-xl border moh-border moh-surface">
              <summary
                class="flex items-center justify-between moh-gutter-x py-3 cursor-pointer select-none list-none
                       text-xs font-semibold moh-text-muted hover:moh-text transition-colors"
              >
                <span>How payouts work</span>
                <Icon
                  name="tabler:chevron-down"
                  class="text-sm transition-transform duration-200 group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div class="px-4 pb-4 space-y-3 text-xs moh-text-muted border-t moh-border pt-3">
                <div class="space-y-2">
                  <div class="font-semibold moh-text text-[11px] uppercase tracking-wide">Earnings per recruit</div>
                  <div class="flex justify-between">
                    <span>Signs up</span>
                    <span class="font-semibold moh-text tabular-nums">$1</span>
                  </div>
                  <div class="flex justify-between">
                    <span>+ Verifies account</span>
                    <span class="font-semibold moh-text tabular-nums">+$3</span>
                  </div>
                  <div class="flex justify-between">
                    <span>+ First Premium month</span>
                    <span class="font-semibold moh-text tabular-nums">+$10</span>
                  </div>
                  <div class="flex justify-between">
                    <span>+ Premium after 60 days</span>
                    <span class="font-semibold moh-text tabular-nums">+$10</span>
                  </div>
                  <div class="flex justify-between border-t moh-border pt-2">
                    <span>Max per person</span>
                    <span class="font-semibold moh-text tabular-nums">$24</span>
                  </div>
                </div>
                <div class="space-y-1.5 leading-relaxed">
                  <p>Payouts are reviewed and paid monthly. Minimum payout: ${{ affiliate.minPayoutCents / 100 }}. Pilot cap: ${{ affiliate.capCents / 100 }} per member.</p>
                  <p>Single-level only. No self-referrals, fake accounts, or spam. If you promote publicly, disclose that you may be paid.</p>
                </div>
              </div>
            </details>

          </div>
        </section>

        <!-- ─── Recruits ────────────────────────────────────────────────────── -->
        <section>
          <!-- Stats strip (when there are set-up recruits) -->
          <div v-if="recruitStats.total > 0" class="moh-gutter-x pt-5 pb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm moh-text-muted tabular-nums">
            <span class="font-semibold moh-text">Your recruits</span>
            <span>{{ recruitStats.total }} joined</span>
            <template v-if="recruitStats.verified > 0">
              <span class="opacity-40">·</span>
              <span>{{ recruitStats.verified }} verified</span>
            </template>
            <template v-if="recruitStats.premium > 0">
              <span class="opacity-40">·</span>
              <span>{{ recruitStats.premium }} Premium</span>
            </template>
          </div>
          <div v-else class="moh-gutter-x pt-5 pb-3">
            <span class="text-base font-semibold moh-text">Your recruits</span>
          </div>

          <!-- Empty state: how it works -->
          <div v-if="groupedRecruits.length === 0" class="moh-gutter-x pb-8 pt-2">
            <div class="rounded-2xl border moh-border moh-surface px-5 py-6 space-y-4">
              <div class="text-sm font-semibold moh-text">How it works</div>
              <div class="space-y-3">
                <div class="flex gap-3 items-start">
                  <div class="shrink-0 w-5 h-5 rounded-full bg-[var(--moh-premium)] flex items-center justify-center mt-0.5">
                    <span class="text-[10px] font-bold text-white">1</span>
                  </div>
                  <div class="text-sm moh-text-muted" style="text-wrap: pretty">
                    Share your referral code or link with men you think belong here.
                  </div>
                </div>
                <div class="flex gap-3 items-start">
                  <div class="shrink-0 w-5 h-5 rounded-full bg-[var(--moh-premium)] flex items-center justify-center mt-0.5">
                    <span class="text-[10px] font-bold text-white">2</span>
                  </div>
                  <div class="text-sm moh-text-muted" style="text-wrap: pretty">
                    They sign up and upgrade to Premium.
                  </div>
                </div>
                <div class="flex gap-3 items-start">
                  <div class="shrink-0 w-5 h-5 rounded-full bg-[var(--moh-premium)] flex items-center justify-center mt-0.5">
                    <span class="text-[10px] font-bold text-white">3</span>
                  </div>
                  <div class="text-sm moh-text-muted" style="text-wrap: pretty">
                    You both get a free month of Premium. No catches.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Grouped list -->
          <div v-else>
            <template v-for="group in groupedRecruits" :key="group.tier">
              <div class="moh-gutter-x py-1.5 flex items-center gap-2 border-b moh-border bg-gray-50 dark:bg-zinc-900/60">
                <span class="text-[11px] font-semibold uppercase tracking-wide moh-text-muted">{{ group.label }}</span>
                <span class="text-[11px] moh-text-muted opacity-60 tabular-nums">{{ group.recruits.length }}</span>
              </div>
              <div class="divide-y divide-gray-200 dark:divide-zinc-800 border-b moh-border">
                <AppUserRow
                  v-for="recruit in group.recruits"
                  :key="recruit.id"
                  :user="toUserRowUser(recruit)"
                  :show-follow-button="false"
                  :name-meta="formatDate(recruit.recruitedAt)"
                />
              </div>
            </template>
          </div>
        </section>
      </template>
    </template>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { AffiliateSummary, Recruit, FollowListUser } from '~/types/api'
import type { ReferralCallback } from '~/composables/presence/types'
import { getApiErrorMessage } from '~/utils/api-error'

definePageMeta({ layout: 'app', ssr: false })

useHead({ title: 'Referrals' })

const { apiFetchData } = useApiClient()
const { user } = useAuth()
const { addReferralCallback, removeReferralCallback } = usePresence()
const { setReferralCode } = useReferralCode()

// ─── State ────────────────────────────────────────────────────────────────────

const loading = ref(true)
const error = ref<string | null>(null)
const referralCode = ref<string | null>(null)
const recruits = ref<Recruit[]>([])
const affiliate = ref<Extract<AffiliateSummary, { isAffiliate: true }> | null>(null)
const codeInput = ref('')
const savingCode = ref(false)
const codeError = ref<string | null>(null)
const editingCode = ref(false)
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

// Template ref for the claim/edit code input — used to autofocus on arrival and on edit.
const claimCodeInputRef = ref<{ $el: HTMLInputElement } | null>(null)

function focusCodeInput() {
  nextTick(() => {
    const el = claimCodeInputRef.value?.$el
    el?.focus()
  })
}

const isPremium = computed(() => Boolean(user.value?.premium || user.value?.premiumPlus))

const codeFontSize = computed(() => {
  const len = (referralCode.value ?? '').length
  if (len <= 6) return '1.75rem'
  if (len <= 10) return '1.375rem'
  if (len <= 14) return '1.125rem'
  if (len <= 17) return '0.9375rem'
  return '0.8125rem'
})

const shareUrl = computed(() => {
  const code = referralCode.value
  if (!code || !import.meta.client) return ''
  return `${window.location.origin}/?ref=${encodeURIComponent(code)}`
})

const shareMessage = computed(() => {
  const code = referralCode.value
  if (!code) return 'Join me on Men of Hunger.'
  return `Join me on Men of Hunger. Use my code ${code} — we'll both get 1 month free when you go Premium.`
})

// ─── Pilot progress ───────────────────────────────────────────────────────────

const pendingProgressPct = computed(() => {
  const a = affiliate.value
  if (!a) return 0
  if (a.pendingCents >= a.minPayoutCents) {
    // Past min payout: show progress toward cap
    return Math.min(100, Math.round((a.pendingCents / a.capCents) * 100))
  }
  return Math.min(99, Math.round((a.pendingCents / a.minPayoutCents) * 100))
})

// ─── Load ────────────────────────────────────────────────────────────────────

async function load() {
  if (!isPremium.value) {
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  try {
    const [billingData, recruitsData, affiliateData] = await Promise.all([
      apiFetchData<{ referralCode: string | null }>('/billing/referral', { method: 'GET' }),
      apiFetchData<Recruit[]>('/billing/referral/recruits', { method: 'GET' }),
      apiFetchData<AffiliateSummary>('/billing/affiliate', { method: 'GET' }),
    ])
    referralCode.value = billingData.referralCode ?? null
    setReferralCode(referralCode.value)
    recruits.value = recruitsData
    if (affiliateData.isAffiliate) {
      affiliate.value = affiliateData
    }
    if (!referralCode.value) focusCodeInput()
  } catch (e) {
    error.value = getApiErrorMessage(e) || 'Failed to load referrals.'
  } finally {
    loading.value = false
  }
}

// ─── Actions ─────────────────────────────────────────────────────────────────

function startEditCode() {
  codeInput.value = referralCode.value ?? ''
  codeError.value = null
  editingCode.value = true
  focusCodeInput()
}

function cancelEditCode() {
  editingCode.value = false
  codeInput.value = ''
  codeError.value = null
}

function onEditKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') { e.preventDefault(); void saveCode() }
  if (e.key === 'Escape') { e.preventDefault(); cancelEditCode() }
}

async function saveCode() {
  const code = codeInput.value.trim()
  if (!code || savingCode.value) return
  savingCode.value = true
  codeError.value = null
  try {
    const res = await apiFetchData<{ referralCode: string }>('/billing/referral/code', {
      method: 'PUT',
      body: { code },
    })
    referralCode.value = res.referralCode
    setReferralCode(res.referralCode)
    codeInput.value = ''
    editingCode.value = false
  } catch (e) {
    codeError.value = getApiErrorMessage(e) || 'Failed to save referral code.'
  } finally {
    savingCode.value = false
  }
}

async function copyShareLink() {
  if (!shareUrl.value || !import.meta.client) return
  try {
    await navigator.clipboard?.writeText(shareUrl.value)
    setCopied()
  } catch {
    codeError.value = 'Could not copy link.'
  }
}

async function shareReferral() {
  if (!shareUrl.value || !import.meta.client) return
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Join Men of Hunger', text: shareMessage.value, url: shareUrl.value })
    } catch { /* user cancelled */ }
    return
  }
  try {
    await navigator.clipboard?.writeText(`${shareMessage.value}\n\n${shareUrl.value}`)
    setCopied()
  } catch {
    codeError.value = 'Could not share.'
  }
}

function setCopied() {
  copied.value = true
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => { copied.value = false; copiedTimer = null }, 1800)
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toUserRowUser(recruit: Recruit): FollowListUser & { isBot?: boolean } {
  return {
    ...recruit,
    relationship: recruit.relationship ?? {
      viewerFollowsUser: false,
      userFollowsViewer: false,
      viewerPostNotificationsEnabled: false,
    },
  }
}

function recruitTier(r: Recruit): 0 | 1 | 2 {
  if (r.premium || r.premiumPlus) return 0  // Premium
  if (r.verifiedStatus !== 'none') return 1  // Verified
  return 2                                   // Joined
}

const RECRUIT_GROUP_LABELS: Record<0 | 1 | 2, string> = {
  0: 'Premium',
  1: 'Verified',
  2: 'Joined',
}

type RecruitGroup = { tier: 0 | 1 | 2; label: string; recruits: Recruit[] }

const groupedRecruits = computed((): RecruitGroup[] => {
  const buckets = new Map<0 | 1 | 2, Recruit[]>()
  for (const r of recruits.value) {
    if (!r.username) continue
    const tier = recruitTier(r)
    const bucket = buckets.get(tier)
    if (bucket) bucket.push(r)
    else buckets.set(tier, [r])
  }
  return ([0, 1, 2] as const)
    .filter((t) => buckets.has(t))
    .map((t) => ({ tier: t, label: RECRUIT_GROUP_LABELS[t], recruits: buckets.get(t)! }))
})

const recruitStats = computed(() => {
  const all = groupedRecruits.value.flatMap((g) => g.recruits)
  return {
    total: all.length,
    verified: all.filter((r) => r.verifiedStatus !== 'none').length,
    premium: all.filter((r) => r.premium || r.premiumPlus).length,
  }
})

// ─── Realtime ────────────────────────────────────────────────────────────────

const referralCb: ReferralCallback = {
  onRecruitUpdated({ recruit }) {
    const idx = recruits.value.findIndex((r) => r.id === recruit.id)
    if (idx >= 0) {
      recruits.value[idx] = recruit
    } else {
      recruits.value.unshift(recruit)
    }
    if (affiliate.value?.isAffiliate) {
      void apiFetchData<AffiliateSummary>('/billing/affiliate', { method: 'GET' }).then((data) => {
        if (data.isAffiliate) affiliate.value = data
      }).catch(() => undefined)
    }
  },
}

onMounted(() => {
  addReferralCallback(referralCb)
  void load()
})

onActivated(() => {
  void load()
})

onBeforeUnmount(() => {
  removeReferralCallback(referralCb)
  if (copiedTimer) clearTimeout(copiedTimer)
})
</script>
