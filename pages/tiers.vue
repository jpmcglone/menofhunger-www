<template>
  <section class="mx-auto w-full max-w-4xl px-4">
    <header class="mb-10 text-center">
      <p class="text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Membership
      </p>
      <h1 class="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
        Three tiers. One brotherhood.
      </h1>
      <p class="mx-auto mt-3 max-w-xl text-base text-gray-600 dark:text-gray-300">
        Everyone gets the core experience. Verify to post publicly and get the blue check. Go premium to unlock longer posts, video, and premium-only content — and support what we're building.
      </p>
    </header>

    <div class="grid gap-6 sm:grid-cols-3 items-start">
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
              Identity or manual verification
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
            Verification is free. Once verified, you can post to Public or Verified and get the blue check on your profile and posts.
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
              Subscribe to unlock more
            </p>
            <div class="mt-4">
              <span class="text-2xl font-bold text-gray-900 dark:text-gray-50">Subscribe</span>
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
            Paid subscription. Premium subscribers get access to everything — longer posts, video, premium visibility, and the premium badge.
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
        </div>
        <p
          v-if="currentTier === 'premium'"
          class="mt-3 text-center text-xs font-medium uppercase tracking-wider"
          style="color: var(--moh-premium);"
        >
          Your tier
        </p>
      </div>
    </div>

    <footer class="mt-10 border-t border-gray-200 pt-6 dark:border-zinc-800">
      <p class="text-center text-sm text-gray-500 dark:text-gray-400">
        Verification is free and required to post publicly. Premium is a paid subscription — pricing and billing in Settings when available.
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
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'Tiers',
})

usePageSeo({
  title: 'Tiers',
  description:
    'Men of Hunger membership tiers: Unverified (free), Verified (free, post publicly + badge), Premium (subscribe for longer posts, video, premium-only content).',
  canonicalPath: '/tiers',
  ogType: 'website',
})

const { user } = useAuth()
const isVerified = computed(() => (user.value?.verifiedStatus ?? 'none') !== 'none')
const isPremium = computed(() => Boolean(user.value?.premium))
// Only one tier highlighted: the highest the user has. Null when not logged in.
const currentTier = computed(() =>
  user.value
    ? isPremium.value
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

// Verified: only what's CHANGED (first) or NEW. Includes items unverified doesn't get.
const verifiedAddOns: { text: string; html?: string }[] = [
  { text: 'Post Public, Verified only, or Only me', html: '<strong>Post Public, Verified only, or Only me</strong>' }, // changed
  { text: 'Verified badge on profile and posts' }, // new
  { text: 'See verified-only posts' }, // new
  { text: 'Reply, boost, mention' },
  { text: '200 characters per post' },
  { text: 'Images and GIFs' },
]

// Premium: only what's CHANGED (first) or NEW. Changed = 500 chars. New = video, badge, see premium-only, support.
const premiumAddOns: { text: string; html?: string }[] = [
  { text: '500 characters per post', html: '<strong>500 characters per post</strong>' }, // changed
  { text: 'Video uploads' }, // new
  { text: 'Premium badge on profile and posts', html: '<strong>Premium badge on profile and posts</strong>' }, // upgrade from verified badge
  { text: 'Post to Premium only and see premium-only posts — exclusive to subscribers' }, // new
  { text: 'Support the product and roadmap' }, // new
]
</script>
