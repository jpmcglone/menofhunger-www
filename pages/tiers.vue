<template>
  <AppPageContent top="standard" bottom="standard">
  <section class="mx-auto w-full px-4">
    <header class="mb-10 text-center">
      <p class="text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {{ tiersIntro.label }}
      </p>
      <h1 class="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
        {{ tiersIntro.title }}
      </h1>
      <p class="mx-auto mt-3 max-w-xl text-base text-gray-600 dark:text-gray-300">
        {{ tiersIntro.description }}
      </p>
    </header>

    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 items-start">
      <!-- Unverified -->
      <div class="flex flex-col gap-2">
        <div
          class="relative flex flex-col rounded-2xl border transition-shadow"
          :class="[
            currentTier === 'unverified'
              ? 'border-2 border-gray-400 shadow-lg ring-2 ring-gray-400/50 dark:border-zinc-500 dark:ring-zinc-500/50'
              : 'border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900/50'
          ]"
        >
          <div class="rounded-t-2xl border-b border-gray-200 bg-gray-50 px-6 py-5 dark:border-zinc-700 dark:bg-zinc-800">
            <h2 class="text-lg font-bold text-gray-800 dark:text-gray-100">
              Unverified
            </h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {{ unverifiedTier.subtitle }}
            </p>
            <div class="mt-4">
              <span class="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {{ unverifiedTier.price.label }}
              </span>
            </div>
          </div>
        <div class="px-6 py-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Who this is for
          </p>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {{ unverifiedTier.who }}
          </p>
        </div>
        <div class="border-t border-gray-200 px-6 py-5 text-sm text-gray-700 dark:text-gray-300">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Can do
          </p>
          <ul class="mt-3 space-y-2">
            <li
              v-for="(item, i) in unverifiedTier.can"
              :key="i"
              class="flex gap-3"
            >
              <Icon name="tabler:check" class="mt-0.5 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
              <span class="flex-1">
                {{ item.text }} <span
                  v-if="item.comingSoon"
                  class="inline-flex h-5 items-center rounded-full border border-gray-300/70 bg-gray-100 px-2 text-[11px] font-semibold text-gray-600 dark:border-zinc-600 dark:bg-zinc-900/60 dark:text-gray-400"
                >
                  Coming soon
                </span>
              </span>
            </li>
          </ul>
        </div>
        <div class="border-t border-gray-200 px-6 py-5 text-sm text-gray-700 dark:text-gray-300">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Cannot do
          </p>
          <ul class="mt-3 space-y-2">
            <li
              v-for="(item, i) in unverifiedTier.cannot"
              :key="i"
              class="flex gap-3"
            >
              <Icon name="tabler:x" class="mt-0.5 shrink-0 text-rose-500/70" aria-hidden="true" />
              <span class="flex-1">{{ item.text }}</span>
            </li>
          </ul>
        </div>
        <details class="border-t border-gray-200 px-6 py-5 text-sm text-gray-600 dark:text-gray-400">
          <summary class="cursor-pointer text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Why this tier exists
          </summary>
          <ul class="mt-3 space-y-2">
            <li v-for="(reason, i) in unverifiedTier.why" :key="i" class="flex gap-3">
              <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-gray-400 dark:bg-gray-500" aria-hidden="true" />
              <span>{{ reason }}</span>
            </li>
          </ul>
        </details>
        </div>
        <p
          v-if="currentTier === 'unverified'"
          class="mt-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
        >
          Your tier
        </p>
      </div>

      <!-- Verified -->
      <div class="flex flex-col gap-2">
        <div
          class="relative flex flex-col rounded-2xl border px-0 transition-shadow"
          :class="currentTier === 'verified' ? 'border-2 ring-2 ring-[var(--moh-verified)]/50 shadow-lg' : ''"
          :style="currentTier === 'verified' ? { borderColor: 'var(--moh-verified)' } : { borderColor: 'rgba(var(--moh-verified-rgb), 0.25)' }"
        >
          <div
            class="rounded-t-2xl border-b px-6 py-5 bg-[#e8f4fc] dark:bg-[#1a2d3d]"
            style="border-color: var(--moh-verified);"
          >
            <h2 class="text-lg font-bold" style="color: var(--moh-verified);">
              Verified
            </h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {{ verifiedTier.subtitle }}
            </p>
            <div class="mt-4">
              <span class="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {{ verifiedTier.price.label }}
              </span>
            </div>
          </div>
        <div class="px-6 py-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Who this is for
          </p>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {{ verifiedTier.who }}
          </p>
        </div>
        <div class="border-t px-6 py-5 text-sm text-gray-700 dark:text-gray-300" style="border-color: rgba(var(--moh-verified-rgb), 0.2);">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="color: var(--moh-verified);">
            Can do
          </p>
          <ul class="mt-3 space-y-2">
            <li
              v-for="(item, i) in verifiedTier.can"
              :key="i"
              class="flex gap-3"
            >
              <Icon name="tabler:check" class="mt-0.5 shrink-0" style="color: var(--moh-verified);" aria-hidden="true" />
              <span class="flex-1">
                {{ item.text }} <span
                  v-if="item.comingSoon"
                  class="inline-flex h-5 items-center rounded-full border border-[var(--moh-verified)]/20 bg-[var(--moh-verified)]/10 px-2 text-[11px] font-semibold text-[var(--moh-verified)]"
                >
                  Coming soon
                </span>
              </span>
            </li>
          </ul>
        </div>
        <div class="border-t px-6 py-5 text-sm text-gray-700 dark:text-gray-300" style="border-color: rgba(var(--moh-verified-rgb), 0.2);">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="color: var(--moh-verified);">
            Cannot do
          </p>
          <ul class="mt-3 space-y-2">
            <li
              v-for="(item, i) in verifiedTier.cannot"
              :key="i"
              class="flex gap-3"
            >
              <Icon name="tabler:x" class="mt-0.5 shrink-0 text-rose-500/70" aria-hidden="true" />
              <span class="flex-1">{{ item.text }}</span>
            </li>
          </ul>
        </div>
        <details class="border-t px-6 py-5 text-sm text-gray-600 dark:text-gray-400" style="border-color: rgba(var(--moh-verified-rgb), 0.2);">
          <summary class="cursor-pointer text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="color: var(--moh-verified);">
            Why this tier exists
          </summary>
          <ul class="mt-3 space-y-2">
            <li v-for="(reason, i) in verifiedTier.why" :key="i" class="flex gap-3">
              <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--moh-verified)]/70" aria-hidden="true" />
              <span>{{ reason }}</span>
            </li>
          </ul>
        </details>
        <div
          v-if="verifiedTier.cta && !isVerified"
          class="border-t px-6 py-4 dark:border-zinc-700"
          style="border-color: rgba(var(--moh-verified-rgb), 0.2);"
        >
          <NuxtLink
            to="/settings"
            class="inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
            style="background-color: var(--moh-verified);"
          >
            {{ verifiedTier.cta.label }}
          </NuxtLink>
        </div>
        </div>
        <p
          v-if="currentTier === 'verified'"
          class="mt-3 text-center text-xs font-medium uppercase tracking-wider"
          style="color: var(--moh-verified);"
        >
          Your tier
        </p>
      </div>

      <!-- Premium -->
      <div class="flex flex-col gap-2">
        <div
          class="relative flex flex-col rounded-2xl border px-0 transition-shadow"
          :class="currentTier === 'premium' ? 'border-2 ring-2 ring-[var(--moh-premium)]/50 shadow-lg' : ''"
          :style="currentTier === 'premium' ? { borderColor: 'var(--moh-premium)' } : { borderColor: 'rgba(var(--moh-premium-rgb), 0.25)' }"
        >
          <div
            class="rounded-t-2xl border-b px-6 py-5 bg-[#fff7ed] dark:bg-[#2d241a]"
            style="border-color: var(--moh-premium);"
          >
            <h2 class="text-lg font-bold" style="color: var(--moh-premium);">
              Premium
            </h2>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {{ premiumTier.subtitle }}
            </p>
            <div class="mt-4">
              <span class="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {{ premiumTier.price.amount }}
              </span>
              <span class="ml-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                {{ premiumTier.price.interval }}
              </span>
            </div>
          </div>
        <div class="px-6 py-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Who this is for
          </p>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {{ premiumTier.who }}
          </p>
        </div>
        <div class="border-t px-6 py-5 text-sm text-gray-700 dark:text-gray-300" style="border-color: rgba(var(--moh-premium-rgb), 0.2);">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="color: var(--moh-premium);">
            Can do
          </p>
          <ul class="mt-3 space-y-2">
            <li
              v-for="(item, i) in premiumTier.can"
              :key="i"
              class="flex gap-3"
            >
              <Icon name="tabler:check" class="mt-0.5 shrink-0" style="color: var(--moh-premium);" aria-hidden="true" />
              <span class="flex-1">
                {{ item.text }} <span
                  v-if="item.comingSoon"
                  class="inline-flex h-5 items-center rounded-full border border-[var(--moh-premium)]/20 bg-[var(--moh-premium)]/10 px-2 text-[11px] font-semibold text-[var(--moh-premium)]"
                >
                  Coming soon
                </span>
              </span>
            </li>
          </ul>
        </div>
        <div class="border-t px-6 py-5 text-sm text-gray-700 dark:text-gray-300" style="border-color: rgba(var(--moh-premium-rgb), 0.2);">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="color: var(--moh-premium);">
            Cannot do
          </p>
          <ul class="mt-3 space-y-2">
            <li
              v-for="(item, i) in premiumTier.cannot"
              :key="i"
              class="flex gap-3"
            >
              <Icon name="tabler:x" class="mt-0.5 shrink-0 text-rose-500/70" aria-hidden="true" />
              <span class="flex-1">{{ item.text }}</span>
            </li>
          </ul>
        </div>
        <details class="border-t px-6 py-5 text-sm text-gray-600 dark:text-gray-400" style="border-color: rgba(var(--moh-premium-rgb), 0.2);">
          <summary class="cursor-pointer text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="color: var(--moh-premium);">
            Why this tier exists
          </summary>
          <ul class="mt-3 space-y-2">
            <li v-for="(reason, i) in premiumTier.why" :key="i" class="flex gap-3">
              <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--moh-premium)]/70" aria-hidden="true" />
              <span>{{ reason }}</span>
            </li>
          </ul>
        </details>
        <div class="border-t px-6 py-4 dark:border-zinc-700" style="border-color: rgba(var(--moh-premium-rgb), 0.2);">
          <NuxtLink
            v-if="premiumTier.cta && !isPremium"
            to="/settings"
            class="inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
            style="background-color: var(--moh-premium);"
          >
            {{ premiumTier.cta.label }}
          </NuxtLink>
        </div>
        </div>
        <p
          v-if="currentTier === 'premium'"
          class="mt-3 text-center text-xs font-medium uppercase tracking-wider"
          style="color: var(--moh-premium);"
        >
          Your tier
        </p>
      </div>

      <!-- Premium+ -->
      <div class="flex flex-col gap-2">
        <div
          class="relative flex flex-col rounded-2xl border px-0 transition-shadow"
          :class="currentTier === 'premiumPlus' ? 'border-2 ring-2 ring-[var(--moh-premium)]/50 shadow-lg' : ''"
          :style="currentTier === 'premiumPlus' ? { borderColor: 'var(--moh-premium)' } : { borderColor: 'rgba(var(--moh-premium-rgb), 0.45)' }"
        >
          <div
            class="rounded-t-2xl border-b px-6 py-5 bg-[#fff7ed] dark:bg-[#2d241a]"
            style="border-color: var(--moh-premium);"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-lg font-bold" style="color: var(--moh-premium);">
                  {{ premiumPlusTier.name }}
                </h2>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {{ premiumPlusTier.subtitle }}
                </p>
              </div>
              <span
                v-if="premiumPlusTier.badge"
                class="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                style="border-color: var(--moh-premium); background: rgba(var(--moh-premium-rgb), 0.08); color: var(--moh-premium);"
              >
                {{ premiumPlusTier.badge }}
              </span>
            </div>
            <div class="mt-4">
              <span class="text-2xl font-bold text-gray-900 dark:text-gray-50">
                {{ premiumPlusTier.price.amount }}
              </span>
              <span class="ml-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                {{ premiumPlusTier.price.interval }}
              </span>
            </div>
          </div>
        <div class="px-6 py-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Who this is for
          </p>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {{ premiumPlusTier.who }}
          </p>
        </div>
        <div class="border-t px-6 py-5 text-sm text-gray-700 dark:text-gray-300" style="border-color: rgba(var(--moh-premium-rgb), 0.2);">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="color: var(--moh-premium);">
            Can do
          </p>
          <ul class="mt-3 space-y-2">
            <li
              v-for="(item, i) in premiumPlusTier.can"
              :key="i"
              class="flex gap-3"
            >
              <Icon name="tabler:check" class="mt-0.5 shrink-0" style="color: var(--moh-premium);" aria-hidden="true" />
              <span class="flex-1">
                {{ item.text }} <span
                  v-if="item.comingSoon"
                  class="inline-flex h-5 items-center rounded-full border border-[var(--moh-premium)]/20 bg-[var(--moh-premium)]/10 px-2 text-[11px] font-semibold text-[var(--moh-premium)]"
                >
                  Coming soon
                </span>
              </span>
            </li>
          </ul>
        </div>
        <div class="border-t px-6 py-5 text-sm text-gray-700 dark:text-gray-300" style="border-color: rgba(var(--moh-premium-rgb), 0.2);">
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="color: var(--moh-premium);">
            Cannot do
          </p>
          <ul class="mt-3 space-y-2">
            <li
              v-for="(item, i) in premiumPlusTier.cannot"
              :key="i"
              class="flex gap-3"
            >
              <Icon name="tabler:x" class="mt-0.5 shrink-0 text-rose-500/70" aria-hidden="true" />
              <span class="flex-1">{{ item.text }}</span>
            </li>
          </ul>
        </div>
        <details class="border-t px-6 py-5 text-sm text-gray-600 dark:text-gray-400" style="border-color: rgba(var(--moh-premium-rgb), 0.2);">
          <summary class="cursor-pointer text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="color: var(--moh-premium);">
            Why this tier exists
          </summary>
          <ul class="mt-3 space-y-2">
            <li v-for="(reason, i) in premiumPlusTier.why" :key="i" class="flex gap-3">
              <span class="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--moh-premium)]/70" aria-hidden="true" />
              <span>{{ reason }}</span>
            </li>
          </ul>
        </details>
        <div class="border-t px-6 py-4 dark:border-zinc-700" style="border-color: rgba(var(--moh-premium-rgb), 0.2);">
          <NuxtLink
            v-if="premiumPlusTier.cta && !isPremiumPlus"
            to="/settings"
            class="inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
            style="background-color: var(--moh-premium);"
          >
            {{ premiumPlusTier.cta.label }}
          </NuxtLink>
        </div>
        </div>
        <p
          v-if="currentTier === 'premiumPlus'"
          class="mt-3 text-center text-xs font-medium uppercase tracking-wider"
          style="color: var(--moh-premium);"
        >
          Your tier
        </p>
      </div>
    </div>

    <footer class="mt-10 border-t border-gray-200 pt-6 dark:border-zinc-800">
      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        {{ tiersFooterNote }}
      </p>
      <div class="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm">
        <NuxtLink to="/about" class="font-medium text-gray-700 hover:underline dark:text-gray-300">
          About
        </NuxtLink>
        <NuxtLink to="/roadmap" class="font-medium text-gray-700 hover:underline dark:text-gray-300">
          Roadmap
        </NuxtLink>
        <NuxtLink to="/status" class="font-medium text-gray-700 hover:underline dark:text-gray-300">
          Status
        </NuxtLink>
      </div>
    </footer>
  </section>
  </AppPageContent>
</template>

<script setup lang="ts">
import { tiers, tiersFooterNote, tiersIntro, tiersMetaDescription, type Tier, type TierId } from '~/config/tiers.data'
definePageMeta({
  layout: 'app',
  title: 'Tiers',
})

usePageSeo({
  title: 'Tiers',
  description:
    tiersMetaDescription,
  canonicalPath: '/tiers',
  ogType: 'website',
})

const { user } = useAuth()
const isVerified = computed(() => (user.value?.verifiedStatus ?? 'none') !== 'none')
const isPremiumPlus = computed(() => Boolean(user.value?.premiumPlus))
// Inclusive so CTAs behave correctly even if data is inconsistent.
const isPremium = computed(() => Boolean(user.value?.premium || user.value?.premiumPlus))
// Only one tier highlighted: the highest the user has. Null when not logged in.
const currentTier = computed(() =>
  user.value
    ? isPremiumPlus.value
      ? 'premiumPlus'
      : isPremium.value
        ? 'premium'
        : isVerified.value
          ? 'verified'
          : 'unverified'
    : null
)

const tierMap = Object.fromEntries(tiers.map((tier) => [tier.id, tier])) as Record<TierId, Tier>
const unverifiedTier = tierMap.unverified
const verifiedTier = tierMap.verified
const premiumTier = tierMap.premium
const premiumPlusTier = tierMap.premiumPlus
</script>
