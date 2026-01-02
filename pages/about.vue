<template>
  <section class="mx-auto w-full max-w-2xl">
    <header class="space-y-3">
      <div class="flex flex-wrap items-center gap-2">
        <Tag value="About" severity="secondary" />
        <Tag value="Brotherhood" severity="info" />
        <Tag value="Ambition" severity="contrast" />
      </div>

      <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
        Men of Hunger
      </h1>
      <p class="text-base sm:text-lg leading-relaxed text-gray-600 dark:text-gray-300">
        Men of Hunger is a brotherhood for ambitious men who want more out of life — more discipline, more clarity,
        more strength, and more impact.
      </p>
    </header>

    <Divider class="my-6" />

    <div class="space-y-5">
      <Card>
        <template #title>What we’re about</template>
        <template #content>
          <div class="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              We don’t apologize for ambition — we aim it. This is a place to sharpen your mindset, build real habits,
              and surround yourself with men who follow through.
            </p>
            <ul class="mt-3 space-y-2">
              <li class="flex gap-2">
                <i class="pi pi-check mt-1 text-sm text-gray-500 dark:text-gray-400" aria-hidden="true" />
                <span><strong class="text-gray-900 dark:text-gray-100">Discipline</strong> over motivation.</span>
              </li>
              <li class="flex gap-2">
                <i class="pi pi-check mt-1 text-sm text-gray-500 dark:text-gray-400" aria-hidden="true" />
                <span><strong class="text-gray-900 dark:text-gray-100">Execution</strong> over excuses.</span>
              </li>
              <li class="flex gap-2">
                <i class="pi pi-check mt-1 text-sm text-gray-500 dark:text-gray-400" aria-hidden="true" />
                <span><strong class="text-gray-900 dark:text-gray-100">Brotherhood</strong> over isolation.</span>
              </li>
            </ul>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>Who it’s for</template>
        <template #content>
          <div class="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              If you’re building something — a career, a business, a family, a body, a mission — and you’re tired of
              doing it alone, you’ll fit here.
            </p>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Not a motivational feed. Not a pity party. Real accountability.
            </p>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>How it works (simple)</template>
        <template #content>
          <div class="space-y-3 text-gray-700 dark:text-gray-300">
            <ol class="space-y-2">
              <li class="flex gap-3">
                <span class="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-800 dark:bg-zinc-900 dark:text-gray-200">1</span>
                <span>Post your goals and wins on your wall.</span>
              </li>
              <li class="flex gap-3">
                <span class="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-800 dark:bg-zinc-900 dark:text-gray-200">2</span>
                <span>Follow men you respect. Keep it tight.</span>
              </li>
              <li class="flex gap-3">
                <span class="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-800 dark:bg-zinc-900 dark:text-gray-200">3</span>
                <span>Show up daily. Do the work. Repeat.</span>
              </li>
            </ol>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>Our promise</template>
        <template #content>
          <div class="space-y-3 text-gray-700 dark:text-gray-300">
            <p>
              Show up hungry. Do the work. Help the men beside you rise.
            </p>
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
              <p class="font-semibold text-gray-900 dark:text-gray-100">
                Stay tuned. Stay hungry.
              </p>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </section>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'app',
  title: 'About'
})

usePageSeo({
  title: 'About',
  description:
    'Men of Hunger is a brotherhood for ambitious men who want more discipline, clarity, strength, and impact.'
})
</script>

