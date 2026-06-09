<template>
  <div class="space-y-6">
    <div class="space-y-2">
      <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Billing</div>
      <div class="text-sm text-gray-600 dark:text-gray-300">
        Manage Premium and Premium+.
      </div>
    </div>

    <div class="rounded-xl border moh-border p-4 moh-surface space-y-4 text-sm">
      <div class="flex items-center justify-between gap-3">
        <div class="moh-text-muted">Verified</div>
        <div class="flex items-center gap-2 font-semibold">
          <span v-if="billingMe?.verified">Yes</span>
          <span v-else>No</span>
          <AppVerifiedBadge
            v-if="billingMe?.verified"
            :status="authUser?.verifiedStatus ?? 'none'"
            :premium="Boolean(billingMe?.premium)"
            :premium-plus="Boolean(billingMe?.premiumPlus)"
            :is-organization="Boolean((authUser as any)?.isOrganization)"
            :steward-badge-enabled="authUser?.stewardBadgeEnabled ?? true"
          />
        </div>
      </div>
      <div class="flex items-center justify-between gap-3">
        <div class="moh-text-muted">Premium</div>
        <div class="font-semibold">
          <span v-if="billingMe?.premiumPlus" class="text-orange-700 dark:text-orange-300">Premium+</span>
          <span v-else-if="billingMe?.premium" class="text-amber-700 dark:text-amber-300">Premium</span>
          <span v-else class="moh-text-muted">No</span>
        </div>
      </div>
      <div v-if="billingMe?.effectiveExpiresAt" class="flex items-center justify-between gap-3">
        <div class="moh-text-muted">Good through</div>
        <div class="font-mono text-xs">{{ formatDateTime(billingMe.effectiveExpiresAt) }}</div>
      </div>
      <div v-if="billingMe?.subscriptionStatus" class="flex items-center justify-between gap-3">
        <div class="moh-text-muted">Subscription</div>
        <div class="font-mono text-xs">{{ billingMe.subscriptionStatus }}</div>
      </div>
      <div v-if="billingMe?.currentPeriodEnd" class="flex items-center justify-between gap-3">
        <div class="moh-text-muted">Renews</div>
        <div class="font-mono text-xs">{{ formatDateTime(billingMe.currentPeriodEnd) }}</div>
      </div>
      <div v-if="billingMe?.cancelAtPeriodEnd" class="text-xs text-amber-700 dark:text-amber-300">
        Canceling at period end.
      </div>

      <template v-if="billingHasAnyFreeMonths">
        <div class="border-t border-gray-200 dark:border-zinc-700 pt-3 space-y-2.5">
          <div class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <span>Free months</span>
            <Icon
              name="tabler:info-circle"
              class="h-4 w-4"
              aria-hidden="true"
              title="Banked free months are used before paid billing. Premium+ months are consumed first."
            />
          </div>

          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div
              v-if="billingFreeMonthsPremiumPlus > 0"
              class="rounded-lg border border-orange-300 bg-orange-50/90 p-3 dark:border-orange-800/50 dark:bg-orange-950/25"
            >
              <div class="text-xs font-medium text-orange-900 dark:text-orange-200">Free Premium+</div>
              <div class="mt-1 text-2xl font-semibold text-orange-950 dark:text-orange-100">{{ billingFreeMonthsPremiumPlus }}</div>
              <div class="text-xs text-orange-800 dark:text-orange-300">month{{ billingFreeMonthsPremiumPlus === 1 ? '' : 's' }} left</div>
            </div>
            <div
              v-if="billingFreeMonthsPremium > 0"
              class="rounded-lg border border-amber-300 bg-amber-50/90 p-3 dark:border-amber-800/50 dark:bg-amber-950/25"
            >
              <div class="text-xs font-medium text-amber-900 dark:text-amber-200">Free Premium</div>
              <div class="mt-1 text-2xl font-semibold text-amber-950 dark:text-amber-100">{{ billingFreeMonthsPremium }}</div>
              <div class="text-xs text-amber-800 dark:text-amber-300">month{{ billingFreeMonthsPremium === 1 ? '' : 's' }} left</div>
            </div>
          </div>
        </div>
      </template>
    </div>

    <AppInlineAlert v-if="billingError" severity="danger">{{ billingError }}</AppInlineAlert>

    <div class="flex flex-wrap items-center gap-3">
      <Button
        v-if="billingMe?.verified && !billingMe?.premium"
        label="Get Premium"
        :loading="checkoutLoading === 'premium'"
        :disabled="Boolean(checkoutLoading)"
        @click="startCheckout('premium')"
      />
      <Button
        v-if="billingMe?.verified && !billingMe?.premiumPlus"
        label="Get Premium+"
        severity="secondary"
        :loading="checkoutLoading === 'premiumPlus'"
        :disabled="Boolean(checkoutLoading)"
        @click="startCheckout('premiumPlus')"
      />
      <Button
        v-if="billingMe?.verified && (billingMe?.premium || billingMe?.premiumPlus)"
        label="Manage subscription"
        severity="secondary"
        :loading="portalLoading"
        :disabled="portalLoading"
        @click="openPortal"
      />
      <NuxtLink
        v-if="billingMe && !billingMe.verified"
        to="/settings/verification"
        class="text-sm font-medium text-gray-700 hover:underline dark:text-gray-300"
      >
        Verify to subscribe
      </NuxtLink>
      <Button
        v-if="isDev && (billingMe?.premium || billingMe?.premiumPlus)"
        label="DEV: Remove Premium"
        severity="danger"
        size="small"
        outlined
        :loading="devResetLoading"
        @click="devResetPremium"
      />
    </div>

    <div v-if="billingLoading" class="text-sm moh-text-muted">Loading billing…</div>

    <!-- Referrals -->
    <div v-if="billingMe" class="space-y-4 border-t border-gray-200 pt-4 dark:border-zinc-800">
      <div class="text-sm font-semibold text-gray-900 dark:text-gray-50">Referrals</div>

      <!-- Your referral code (premium-only) -->
      <div class="rounded-xl border moh-border p-4 moh-surface space-y-3 text-sm">
        <div class="flex items-center justify-between gap-3">
          <div class="font-medium text-gray-700 dark:text-gray-200">Your referral code</div>
        </div>
        <template v-if="billingMe.premium">
          <div v-if="billingMe.referralCode" class="flex items-center gap-2">
            <span class="font-mono text-base font-semibold tracking-wide">{{ billingMe.referralCode }}</span>
            <button
              type="button"
              class="text-xs underline transition-colors"
              :class="referralCodeCopied
                ? 'text-green-600 dark:text-green-400 cursor-default'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100'"
              :disabled="referralCodeCopied"
              @click="copyReferralCode"
            >{{ referralCodeCopied ? 'Copied!' : 'Copy' }}</button>
          </div>
          <p v-if="billingMe.referralCode" class="text-xs text-gray-500 dark:text-gray-400">
            Share this code. Anyone who uses it will automatically follow you — and when they go premium you both earn +1 free month.
          </p>
          <div class="flex gap-2">
            <InputText
              v-model="referralCodeDraft"
              class="flex-1 font-mono"
              :placeholder="billingMe.referralCode ? 'Change code' : 'Set your code (e.g. YOURNAME)'"
              spellcheck="false"
              autocomplete="off"
              maxlength="20"
              :disabled="referralCodeSaving"
            />
            <Button
              :label="billingMe.referralCode ? 'Update' : 'Set'"
              :loading="referralCodeSaving"
              :disabled="!referralCodeDraft.trim() || referralCodeSaving"
              @click="saveReferralCode"
            />
          </div>
          <AppInlineAlert v-if="referralCodeError" severity="danger">{{ referralCodeError }}</AppInlineAlert>
          <div v-if="referralCodeSaved" class="text-xs text-green-700 dark:text-green-400">Referral code saved.</div>
          <p class="text-xs text-gray-400 dark:text-gray-500">4–20 characters. Letters, numbers, hyphens, underscores only.</p>
        </template>
        <p v-else class="text-sm text-gray-500 dark:text-gray-400">
          Become a premium member to get a referral code.
        </p>
      </div>

      <!-- Recruiter -->
      <div class="rounded-xl border moh-border p-4 moh-surface space-y-3 text-sm">
        <div class="font-medium text-gray-700 dark:text-gray-200">Who recruited you</div>
        <template v-if="billingMe.recruiter">
          <!-- Rich recruiter card with hover preview -->
          <NuxtLink
            v-if="billingMe.recruiter.username"
            :to="`/u/${billingMe.recruiter.username}`"
            class="flex items-center gap-3 rounded-xl border moh-border p-3 hover:bg-gray-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <AppUserAvatar
              :user="{
                id: billingMe.recruiter.id,
                avatarUrl: billingMe.recruiter.avatarUrl,
                name: billingMe.recruiter.name,
                username: billingMe.recruiter.username,
                premiumPlus: billingMe.recruiter.premiumPlus,
              }"
              size-class="h-10 w-10 shrink-0"
              :show-presence="false"
            />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="font-semibold text-gray-900 dark:text-gray-50 truncate">
                  {{ billingMe.recruiter.name || billingMe.recruiter.username }}
                </span>
                <AppVerifiedBadge
                  :status="billingMe.recruiter.verifiedStatus"
                  :premium="billingMe.recruiter.premium"
                  :premium-plus="billingMe.recruiter.premiumPlus"
                  size="xs"
                />
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                @{{ billingMe.recruiter.username }}
              </div>
            </div>
            <div class="shrink-0 flex flex-col items-end gap-1">
              <Icon name="tabler:user-check" class="h-4 w-4 text-green-600" aria-hidden="true" />
              <span
                v-if="billingMe.referralBonusGranted"
                class="text-[11px] text-green-700 dark:text-green-400 font-medium"
              >Bonus granted</span>
              <span v-else class="text-[11px] text-gray-400 dark:text-gray-500">Bonus pending</span>
            </div>
          </NuxtLink>
          <!-- Fallback: no username -->
          <div v-else class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
            <Icon name="tabler:user-check" class="h-4 w-4 text-green-600 shrink-0" aria-hidden="true" />
            <span>{{ billingMe.recruiter.name ?? 'Unknown' }}</span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">Your recruiter is locked in. When you make your first premium payment, you both receive +1 free month.</p>
        </template>
        <template v-else>
          <p class="text-xs text-gray-500 dark:text-gray-400">Enter a referral code to link a recruiter. You'll automatically follow them — and when you go premium you both earn +1 free month. Once set, it cannot be changed.</p>
          <div class="flex gap-2">
            <InputText
              v-model="recruiterCodeDraft"
              class="flex-1 font-mono"
              placeholder="Enter referral code"
              spellcheck="false"
              autocomplete="off"
              :disabled="recruiterSaving"
            />
            <Button
              label="Apply"
              :loading="recruiterSaving"
              :disabled="!recruiterCodeDraft.trim() || recruiterSaving"
              @click="applyRecruiter"
            />
          </div>
          <AppInlineAlert v-if="recruiterError" severity="danger">{{ recruiterError }}</AppInlineAlert>
        </template>
      </div>

      <!-- Recruits list -->
      <div v-if="billingMe.premium" class="rounded-xl border moh-border p-4 moh-surface space-y-3 text-sm">
        <div class="flex items-center justify-between gap-2">
          <div class="font-medium text-gray-700 dark:text-gray-200">
            Your recruits
            <span v-if="billingMe.recruitCount > 0" class="ml-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">{{ billingMe.recruitCount }}</span>
          </div>
        </div>
        <template v-if="recruitsLoading">
          <div class="text-xs text-gray-500 dark:text-gray-400">Loading recruits…</div>
        </template>
        <template v-else-if="recruits.length === 0">
          <p class="text-xs text-gray-500 dark:text-gray-400">No one has used your code yet. Share it!</p>
        </template>
        <ul v-else class="divide-y divide-gray-100 dark:divide-zinc-800">
          <li v-for="r in recruits" :key="r.id" class="flex items-center justify-between gap-3 py-2">
            <div class="flex items-center gap-2 min-w-0">
              <Icon name="tabler:user-plus" class="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              <span class="truncate font-medium">
                <NuxtLink v-if="r.username" :to="`/u/${r.username}`" class="hover:underline">@{{ r.username }}</NuxtLink>
                <span v-else>{{ r.name ?? r.id }}</span>
              </span>
            </div>
            <div class="flex items-center gap-2 shrink-0 text-xs text-gray-500 dark:text-gray-400">
              <span v-if="r.bonusGranted" class="text-green-600 dark:text-green-400 font-medium">+1 month</span>
              <span v-else-if="r.isPremium" class="text-amber-600 dark:text-amber-400">premium</span>
              <span v-else>no premium yet</span>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <!-- Checkout success modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="checkoutSuccessModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          @click.self="checkoutSuccessModal = false"
        >
          <div class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 text-center space-y-4">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full" :class="checkoutSuccessTier === 'premiumPlus' ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-amber-100 dark:bg-amber-900/30'">
              <Icon name="tabler:crown" class="h-7 w-7" :class="checkoutSuccessTier === 'premiumPlus' ? 'text-orange-600 dark:text-orange-400' : 'text-amber-600 dark:text-amber-400'" />
            </div>
            <h2 class="text-xl font-bold text-gray-900 dark:text-gray-50">
              Welcome to {{ checkoutSuccessTier === 'premiumPlus' ? 'Premium+' : 'Premium' }}!
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Thank you for supporting Men of Hunger. Your subscription is now active and you have access to all {{ checkoutSuccessTier === 'premiumPlus' ? 'Premium+' : 'Premium' }} features.
            </p>
            <div class="flex flex-col gap-2 pt-2">
              <NuxtLink
                to="/tiers"
                class="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 text-white"
                :class="checkoutSuccessTier === 'premiumPlus' ? 'bg-orange-600' : 'bg-amber-600'"
                @click="checkoutSuccessModal = false"
              >
                See what's included
              </NuxtLink>
              <button
                type="button"
                class="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                @click="checkoutSuccessModal = false"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useSettingsBilling } from '~/composables/settings/useSettingsBilling'
import { formatDateTime } from '~/utils/time-format'

const isDev = import.meta.dev
const { user: authUser } = useAuth()

const {
  billingMe,
  billingLoading,
  billingError,
  checkoutLoading,
  portalLoading,
  billingFreeMonthsPremiumPlus,
  billingFreeMonthsPremium,
  billingHasAnyFreeMonths,
  refreshBilling,
  startCheckout,
  openPortal,
  devResetLoading,
  devResetPremium,
  checkoutSuccessModal,
  checkoutSuccessTier,
  referralCodeDraft,
  referralCodeSaving,
  referralCodeSaved,
  referralCodeError,
  referralCodeCopied,
  copyReferralCode,
  saveReferralCode,
  recruiterCodeDraft,
  recruiterSaving,
  recruiterError,
  applyRecruiter,
  recruits,
  recruitsLoading,
} = useSettingsBilling()

onMounted(() => {
  void refreshBilling()
})
</script>
