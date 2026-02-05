<template>
  <section class="mx-auto w-full max-w-2xl">
    <header class="space-y-4">
      <p class="text-sm font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {{ roadmapIntro.label }}
        <span class="ml-2 font-normal normal-case tracking-normal">— as of {{ roadmapAsOfDate }}</span>
      </p>
      <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-3xl">
        {{ roadmapIntro.title }}
      </h1>
      <p class="text-base leading-relaxed text-gray-600 dark:text-gray-300">
        {{ roadmapIntro.description }}
      </p>
    </header>

    <div class="mt-10 space-y-12">
      <article
        v-for="phase in roadmapPhases"
        :key="phase.id"
        class="relative"
        :id="phase.id"
      >
        <div
          class="absolute left-0 top-0 h-full w-px bg-gradient-to-b via-gray-300 dark:via-zinc-600 to-transparent"
          :class="phase.isHighlight ? 'from-[var(--moh-premium)]' : 'from-gray-400 dark:from-zinc-500'"
          aria-hidden="true"
        />
        <div class="pl-6">
          <div class="flex flex-wrap items-baseline gap-2">
            <time
              :datetime="phase.datetime"
              class="text-lg font-semibold"
              :class="phase.isHighlight ? 'text-[var(--moh-premium)]' : 'text-gray-700 dark:text-gray-300'"
            >
              {{ phase.date }}
            </time>
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-medium"
              :class="phase.isHighlight ? 'bg-[var(--moh-premium)]/10 font-semibold text-[var(--moh-premium)]' : 'border border-gray-300 bg-gray-50 text-gray-600 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-gray-400'"
            >
              {{ phase.badge }}
            </span>
          </div>
          <h2 class="mt-2 text-xl font-semibold text-gray-900 dark:text-gray-50">
            {{ phase.title }}
          </h2>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {{ phase.description }}
          </p>

          <div class="mt-4 space-y-4">
            <div v-for="chunk in phase.chunks" :key="chunk.title">
              <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {{ chunk.title }}
              </h3>
              <ul class="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li
                  v-for="(item, i) in chunk.items"
                  :key="i"
                  class="flex gap-3"
                >
                  <span
                    class="mt-0.5 h-1 w-1 shrink-0 rounded-full"
                    :class="item.done
                      ? 'bg-emerald-500'
                      : item.inProgress
                        ? 'bg-amber-500'
                        : (phase.isHighlight ? 'bg-[var(--moh-premium)]' : 'border-2 border-gray-400 bg-transparent dark:border-zinc-500')"
                    aria-hidden="true"
                  />
                  <span
                    class="flex-1"
                    :class="item.done ? 'line-through text-gray-500 dark:text-gray-500' : ''"
                    v-html="formatItem(item)"
                  />
                  <span
                    v-if="item.inProgress"
                    class="inline-flex shrink-0 self-start items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold leading-none text-amber-600 dark:border-amber-400/30 dark:text-amber-400"
                  >
                    In progress
                  </span>
                  <span
                    v-else-if="item.done"
                    class="inline-flex shrink-0 self-start items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold leading-none text-emerald-600 dark:border-emerald-400/30 dark:text-emerald-300"
                  >
                    Done
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </article>

      <article class="relative">
        <div
          class="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-gray-300 via-gray-200 dark:from-zinc-600 dark:via-zinc-700 to-transparent"
          aria-hidden="true"
        />
        <div class="pl-6">
          <div class="flex flex-wrap items-baseline gap-2">
            <span class="text-lg font-semibold text-gray-500 dark:text-gray-400">
              {{ roadmapBacklog.title }}
            </span>
            <span class="rounded-full border border-gray-200 bg-gray-50/80 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:border-zinc-700 dark:bg-zinc-900/30 dark:text-gray-500">
              {{ roadmapBacklog.badge }}
            </span>
          </div>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {{ roadmapBacklog.description }}
          </p>

          <div class="mt-4 space-y-4">
            <div v-for="chunk in roadmapBacklog.chunks" :key="chunk.title">
              <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {{ chunk.title }}
              </h3>
              <ul class="mt-2 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li
                  v-for="(item, i) in chunk.items"
                  :key="i"
                  class="flex gap-3"
                >
                  <span
                    class="mt-0.5 h-1 w-1 shrink-0 rounded-full"
                    :class="item.done ? 'bg-emerald-500' : item.inProgress ? 'bg-amber-500' : 'border border-gray-300 bg-transparent dark:border-zinc-600'"
                    aria-hidden="true"
                  />
                  <span
                    class="flex-1"
                    :class="item.done ? 'line-through text-gray-500 dark:text-gray-500' : ''"
                    v-html="formatItem(item)"
                  />
                  <span
                    v-if="item.inProgress"
                    class="inline-flex shrink-0 self-start items-center rounded-full border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold leading-none text-amber-600 dark:border-amber-400/30 dark:text-amber-400"
                  >
                    In progress
                  </span>
                  <span
                    v-else-if="item.done"
                    class="inline-flex shrink-0 self-start items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold leading-none text-emerald-600 dark:border-emerald-400/30 dark:text-emerald-300"
                  >
                    Done
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </article>
    </div>

    <footer class="mt-14 border-t border-gray-200 pt-6 dark:border-zinc-800">
      <p class="text-xs text-gray-500 dark:text-gray-400">
        {{ roadmapFooterDisclaimer }}
      </p>
      <div class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <NuxtLink to="/about" class="font-medium text-gray-700 hover:underline dark:text-gray-300">
          About
        </NuxtLink>
        <NuxtLink to="/tiers" class="font-medium text-gray-700 hover:underline dark:text-gray-300">
          Tiers
        </NuxtLink>
        <NuxtLink to="/feedback" class="font-medium text-gray-700 hover:underline dark:text-gray-300">
          Feedback
        </NuxtLink>
        <NuxtLink to="/status" class="font-medium text-gray-700 hover:underline dark:text-gray-300">
          Status
        </NuxtLink>
      </div>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { siteConfig } from '~/config/site'
import {
  roadmapAsOfDate,
  roadmapIntro,
  roadmapPhases,
  roadmapBacklog,
  roadmapFooterDisclaimer,
  roadmapMetaDescription,
  getRoadmapSeoDescription,
  getRoadmapJsonLd
} from '~/config/roadmap.data'

definePageMeta({
  layout: 'app',
  title: 'Roadmap',
})

const canonicalPath = '/roadmap'
const roadmapJsonLd = getRoadmapJsonLd(`${siteConfig.url}${canonicalPath}`)

usePageSeo({
  title: 'Roadmap',
  description: roadmapMetaDescription,
  canonicalPath,
  ogType: 'website',
  image: '/images/logo-black-bg.png',
  jsonLdGraph: [roadmapJsonLd],
})

useHead({
  meta: [
    {
      name: 'keywords',
      content: 'Men of Hunger roadmap, product roadmap, upcoming features, new features, community roadmap, brotherhood app features'
    }
  ]
})

/** Turn **bold** in item text into <strong> for display. */
function formatItem(item: { text: string }): string {
  return item.text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}
</script>
