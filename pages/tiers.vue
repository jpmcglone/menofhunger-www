<template>
  <AppPageContent top="standard" bottom="standard">
  <section class="mx-auto w-full px-4">
    <header class="mb-10 text-center">
      <p class="text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Membership
      </p>
      <h1 class="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
        Unverified, Verified, Premium, and Premium+ — what you get with each tier.
      </h1>
      <p class="mx-auto mt-3 max-w-xl text-base text-gray-600 dark:text-gray-300">
        Everyone gets the core experience. Verify to post publicly and build trust. Go Premium for longer posts, video uploads, and premium-only visibility. Upgrade to Premium+ to support the mission — higher limits and perks are coming soon.
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
              New or not yet verified
            </p>
            <div class="mt-4">
              <span class="text-2xl font-bold text-gray-900 dark:text-gray-50">Free</span>
            </div>
          </div>
        <ul class="flex-1 space-y-3 px-6 py-5 text-sm text-gray-700 dark:text-gray-300">
          <li
            v-for="(item, i) in unverifiedItems"
            :key="i"
            class="flex gap-3"
          >
            <i class="pi pi-check mt-0.5 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <span>{{ item }}</span>
          </li>
        </ul>
        <div class="border-t border-gray-200 px-6 py-4 dark:border-zinc-700">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400">
            For this tier
          </p>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            You cannot post to the public feed until you verify. You can still read and boost public posts.
          </p>
        </div>
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
              Trust + credibility
            </p>
            <div class="mt-4">
              <span class="text-2xl font-bold text-gray-900 dark:text-gray-50">Free</span>
            </div>
          </div>
        <ul class="flex-1 space-y-3 px-6 py-5 text-sm text-gray-700 dark:text-gray-300">
          <li class="flex gap-3">
            <i class="pi pi-check mt-0.5 shrink-0" style="color: var(--moh-verified);" aria-hidden="true" />
            <span>Everything in Unverified</span>
          </li>
          <li
            v-for="(item, i) in verifiedAddOns"
            :key="i"
            class="flex gap-3"
          >
            <i class="pi pi-check mt-0.5 shrink-0" style="color: var(--moh-verified);" aria-hidden="true" />
            <span v-html="item.html ? item.html : escapeHtml(item.text)" />
          </li>
        </ul>
        <div
          class="border-t px-6 py-4 dark:border-zinc-700"
          style="border-color: rgba(var(--moh-verified-rgb), 0.2);"
        >
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400" style="color: var(--moh-verified);">
            For this tier
          </p>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Verification is free. Once verified, you can post publicly and your profile earns stronger trust signals in the community.
          </p>
          <NuxtLink
            v-if="!isVerified"
            to="/settings"
            class="mt-3 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
            style="background-color: var(--moh-verified);"
          >
            Verify
          </NuxtLink>
        </div>

        <div
          v-if="comingSoonVerified.length"
          class="border-t px-6 py-4 dark:border-zinc-700"
          style="border-color: rgba(var(--moh-verified-rgb), 0.2);"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Coming soon
          </p>
          <ul class="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li v-for="(t, i) in comingSoonVerified" :key="i" class="flex gap-3">
              <i class="pi pi-clock mt-0.5 shrink-0 opacity-70" style="color: var(--moh-verified);" aria-hidden="true" />
              <span>{{ t }}</span>
            </li>
          </ul>
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
              Builder tier
            </p>
            <div class="mt-4">
              <span class="text-2xl font-bold text-gray-900 dark:text-gray-50">$19.99</span>
              <span class="ml-1 text-sm font-medium text-gray-600 dark:text-gray-300">/ month</span>
            </div>
          </div>
        <ul class="flex-1 space-y-3 px-6 py-5 text-sm text-gray-700 dark:text-gray-300">
          <li class="flex gap-3">
            <i class="pi pi-check mt-0.5 shrink-0" style="color: var(--moh-premium);" aria-hidden="true" />
            <span>Everything in Verified</span>
          </li>
          <li
            v-for="(item, i) in premiumAddOns"
            :key="i"
            class="flex gap-3"
          >
            <i class="pi pi-check mt-0.5 shrink-0" style="color: var(--moh-premium);" aria-hidden="true" />
            <span v-html="item.html ? item.html : escapeHtml(item.text)" />
          </li>
        </ul>
        <div class="border-t px-6 py-4 dark:border-zinc-700" style="border-color: rgba(var(--moh-premium-rgb), 0.2);">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400" style="color: var(--moh-premium);">
            For this tier
          </p>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            For creators who want more: longer posts, video uploads, and premium-only visibility.
          </p>
          <NuxtLink
            v-if="!isPremium"
            to="/settings"
            class="mt-3 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
            style="background-color: var(--moh-premium);"
          >
            Get Premium
          </NuxtLink>
        </div>

        <div
          v-if="comingSoonPremium.length"
          class="border-t px-6 py-4 dark:border-zinc-700"
          style="border-color: rgba(var(--moh-premium-rgb), 0.2);"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Coming soon
          </p>
          <ul class="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li v-for="(t, i) in comingSoonPremium" :key="i" class="flex gap-3">
              <i class="pi pi-clock mt-0.5 shrink-0 opacity-70" style="color: var(--moh-premium);" aria-hidden="true" />
              <span>{{ t }}</span>
            </li>
          </ul>
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
                  Premium+
                </h2>
                <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Supporters tier
                </p>
              </div>
              <span
                class="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
                style="border-color: var(--moh-premium); background: rgba(var(--moh-premium-rgb), 0.08); color: var(--moh-premium);"
              >
                Best perks
              </span>
            </div>
            <div class="mt-4">
              <span class="text-2xl font-bold text-gray-900 dark:text-gray-50">$49.99</span>
              <span class="ml-1 text-sm font-medium text-gray-600 dark:text-gray-300">/ month</span>
            </div>
          </div>
        <ul class="flex-1 space-y-3 px-6 py-5 text-sm text-gray-700 dark:text-gray-300">
          <li
            v-for="(item, i) in premiumPlusAddOns"
            :key="i"
            class="flex gap-3"
          >
            <i class="pi pi-check mt-0.5 shrink-0" style="color: var(--moh-premium);" aria-hidden="true" />
            <span v-html="item.html ? item.html : escapeHtml(item.text)" />
          </li>
        </ul>
        <div class="border-t px-6 py-4 dark:border-zinc-700" style="border-color: rgba(var(--moh-premium-rgb), 0.2);">
          <p class="text-xs font-medium text-gray-500 dark:text-gray-400" style="color: var(--moh-premium);">
            For this tier
          </p>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            For supporters who want to go all-in: a Premium+ member designation, with higher limits and perks coming soon.
          </p>
          <NuxtLink
            v-if="!isPremiumPlus"
            to="/settings"
            class="mt-3 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
            style="background-color: var(--moh-premium);"
          >
            Get Premium+
          </NuxtLink>
        </div>

        <div
          v-if="comingSoonPremiumPlus.length"
          class="border-t px-6 py-4 dark:border-zinc-700"
          style="border-color: rgba(var(--moh-premium-rgb), 0.2);"
        >
          <p class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Coming soon
          </p>
          <ul class="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <li v-for="(t, i) in comingSoonPremiumPlus" :key="i" class="flex gap-3">
              <i class="pi pi-clock mt-0.5 shrink-0 opacity-70" style="color: var(--moh-premium);" aria-hidden="true" />
              <span>{{ t }}</span>
            </li>
          </ul>
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
        Verification is free and required to post publicly. Premium and Premium+ are paid subscriptions — pricing and billing in Settings.
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
definePageMeta({
  layout: 'app',
  title: 'Tiers',
})

usePageSeo({
  title: 'Tiers',
  description:
    'Men of Hunger membership tiers: Unverified (free), Verified (free, build trust + post publicly), Premium ($19.99/mo, longer posts + video + premium-only visibility), Premium+ ($49.99/mo, supporters tier; higher limits/perks coming soon).',
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Unverified: full list
const unverifiedItems: string[] = [
  'Home feed, Explore, Profile',
  'Follow people, Bookmarks, Notifications',
  'Read and boost public posts',
  'Post Only me (private)',
]

// Verified: only list what's truly honored today.
const verifiedAddOns: { text: string; html?: string }[] = [
  { text: 'Post Public, Verified only, or Only me', html: '<strong>Post Public, Verified only, or Only me</strong>' },
  { text: 'Verified badge on profile and posts' },
  { text: 'See verified-only posts' },
  { text: 'Verified-only chat (DMs) with block list controls' },
  { text: '200 characters per post' },
]

// Premium: only list what's truly honored today.
const premiumAddOns: { text: string; html?: string }[] = [
  { text: '500 characters per post', html: '<strong>500 characters per post</strong>' },
  { text: 'Video uploads', html: '<strong>Video uploads</strong>' },
  { text: 'Premium badge on profile and posts', html: '<strong>Premium badge on profile and posts</strong>' },
  { text: 'Post to Premium only and see premium-only posts' },
]

// Premium+: currently the same feature set as Premium (higher limits/perks are coming soon).
const premiumPlusAddOns: { text: string; html?: string }[] = [
  { text: 'Everything in Premium' },
  { text: 'Premium+ member designation on badge hover', html: '<strong>Premium+ member designation on badge hover</strong>' },
]

const comingSoonVerified: string[] = [
  'Stronger trust signals (manual/identity verification polish)',
  'Impersonation protection + priority review',
  'Enhanced safety controls (muting + reply controls)',
]

const comingSoonPremium: string[] = [
  'Better reach and distribution surfaces',
  'Creation tools (drafts, edit window, scheduling)',
  'Community tools (groups/circles, profile highlights, featured links)',
  'Safety + quality filters (keyword filters, advanced controls)',
]

const comingSoonPremiumPlus: string[] = [
  'Highest limits for creators (uploads and usage caps)',
  'Priority support + early access',
  'Additional reach tools and perks',
]
</script>
