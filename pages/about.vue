<template>
  <AppPageContent top="standard" bottom="standard">
  <section class="mx-auto w-full max-w-6xl px-5 pb-10 sm:px-8 sm:pb-14 space-y-6">
    <header class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <Tag value="About" severity="secondary" />
        <Tag value="Community" severity="info" />
        <Tag value="Conversation" severity="contrast" />
      </div>

      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
        Men of Hunger
      </h1>
      <p class="text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300">
        Men of Hunger is a trusted community for men who want real conversation — not another noisy feed.
        Verified members, honest dialogue, and accountability that doesn't require an algorithm.
      </p>
    </header>

    <Divider />

    <div class="space-y-3">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50">What we're about</h2>
      <div class="space-y-3 text-gray-700 dark:text-gray-300">
        <p>
          Most platforms optimize for engagement. This one optimizes for conversation. We're here for the
          dialogue that actually sharpens you — not the feed that keeps you scrolling.
        </p>
        <ul class="mt-3 space-y-2">
          <li class="flex gap-2">
            <Icon name="tabler:check" class="mt-1 text-sm text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <span><strong class="text-gray-900 dark:text-gray-100">Signal</strong> over noise.</span>
          </li>
          <li class="flex gap-2">
            <Icon name="tabler:check" class="mt-1 text-sm text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <span><strong class="text-gray-900 dark:text-gray-100">Honesty</strong> over performance.</span>
          </li>
          <li class="flex gap-2">
            <Icon name="tabler:check" class="mt-1 text-sm text-gray-500 dark:text-gray-400" aria-hidden="true" />
            <span><strong class="text-gray-900 dark:text-gray-100">Brotherhood</strong> over isolation.</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="space-y-3">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50">Who it's for</h2>
      <div class="space-y-3 text-gray-700 dark:text-gray-300">
        <p>
          If you're building something — a career, a family, a mission — and you're tired of feeds that never
          quite scratch the itch for real conversation, you'll fit here.
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Not a motivational feed. Not a highlight reel. Real dialogue with men who are actually trying.
        </p>
      </div>
    </div>

    <div class="space-y-3">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50">How it works</h2>
      <div class="space-y-3 text-gray-700 dark:text-gray-300">
        <ol class="space-y-2">
          <li class="flex gap-3">
            <span class="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-800 dark:bg-zinc-900 dark:text-gray-200">1</span>
            <span>Verify your identity. No anonymous accounts, no noise.</span>
          </li>
          <li class="flex gap-3">
            <span class="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-800 dark:bg-zinc-900 dark:text-gray-200">2</span>
            <span>Follow men worth listening to. Read, reply, contribute.</span>
          </li>
          <li class="flex gap-3">
            <span class="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-800 dark:bg-zinc-900 dark:text-gray-200">3</span>
            <span>Check in daily. Stay accountable. It compounds.</span>
          </li>
        </ol>
      </div>
    </div>

    <div class="space-y-3">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-gray-50">Our promise</h2>
      <div class="space-y-3 text-gray-700 dark:text-gray-300">
        <p>
          Show up. Say something real. Help the men beside you rise.
        </p>
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <p class="font-semibold text-gray-900 dark:text-gray-100">
            Stay tuned. Stay hungry.
          </p>
        </div>
      </div>
    </div>
  </section>
  </AppPageContent>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'default',
  title: 'About'
})

usePageSeo({
  title: 'About',
  description:
    'Men of Hunger is a trusted community for men who want real conversation, not more noise — accountability, honest dialogue, and brotherhood.',
  canonicalPath: '/about',
  ogType: 'website',
  image: '/images/banner.png',
})
</script>
