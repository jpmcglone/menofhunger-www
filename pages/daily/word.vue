<template>
  <AppPageContent>
    <div class="moh-gutter-x py-12">
      <div class="max-w-xl mx-auto">
        <!-- Header label -->
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-0.5">
            <span
              class="inline-flex translate-y-[1px] items-center rounded-full border border-black/10 bg-white/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
            >
              Word
            </span>
            <span class="translate-x-[-1px] translate-y-[1px] text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
              of the Day
            </span>
          </div>

          <a
            v-if="data?.dictionaryUrl"
            :href="data.dictionaryUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="moh-text-muted hover:moh-text inline-flex items-center gap-1 text-xs transition-colors"
            aria-label="Open in Webster's 1828 Dictionary"
          >
            <Icon name="tabler:external-link" class="text-[11px]" aria-hidden="true" />
            Webster's 1828
          </a>
        </div>

        <template v-if="data?.word">
          <!-- The word -->
          <div
            class="moh-text text-4xl sm:text-5xl font-semibold tracking-tight mb-6"
            style="font-family: var(--moh-font-serif);"
          >
            {{ data.word }}
          </div>

          <!-- Definition -->
          <div v-if="hasDefinition" class="mt-2">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="definitionHtml" class="moh-wotd-definition moh-text text-[15px] leading-relaxed" v-html="definitionHtml" />
            <div v-else class="moh-text space-y-3 text-[15px] leading-relaxed">
              <p v-for="(p, idx) in paragraphs" :key="idx" class="whitespace-pre-wrap">{{ p }}</p>
            </div>
          </div>

          <p v-if="dayLabel" class="mt-10 text-xs text-gray-400 dark:text-gray-500">
            {{ dayLabel }}
          </p>
        </template>

        <!-- Loading skeleton -->
        <div v-else class="space-y-4 animate-pulse" aria-hidden="true">
          <div class="h-10 bg-gray-200 dark:bg-zinc-800 rounded mx-auto w-48 mb-8" />
          <div class="h-4 bg-gray-200 dark:bg-zinc-800 rounded-full w-full" />
          <div class="h-4 bg-gray-200 dark:bg-zinc-800 rounded-full w-5/6" />
          <div class="h-4 bg-gray-200 dark:bg-zinc-800 rounded-full w-4/6" />
          <div class="h-4 bg-gray-200 dark:bg-zinc-800 rounded-full w-full" />
          <div class="h-4 bg-gray-200 dark:bg-zinc-800 rounded-full w-3/4" />
        </div>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { Websters1828WordOfDay, DailyContentToday } from '~/types/api'

definePageMeta({
  layout: 'app',
  hideTopBar: true,
})

const { apiFetchData } = useApiClient()

const { data } = await useAsyncData<Websters1828WordOfDay | null>(
  'websters1828:wotd',
  () => apiFetchData<Websters1828WordOfDay>('/meta/websters1828/wotd?includeDefinition=1', { method: 'GET' }),
  { default: () => null },
)

// Also warm the daily-content cache (used by the right rail) so it doesn't double-fetch.
const { data: dailyContent } = await useAsyncData<DailyContentToday | null>(
  'daily-content:today',
  () => apiFetchData<DailyContentToday>('/meta/daily-content/today', { method: 'GET' }),
  { default: () => null },
)

const definitionHtml = computed(() => {
  const html = data.value?.definitionHtml ?? null
  return html && html.trim() ? html : null
})

const paragraphs = computed(() => {
  const def = data.value?.definition ?? null
  if (!def) return []
  return def
    .split(/\n{2,}/g)
    .map((s) => s.trim())
    .filter(Boolean)
})

const hasDefinition = computed(() => Boolean(definitionHtml.value || paragraphs.value.length))

const dayLabel = computed(() => {
  const dayKey = dailyContent.value?.dayKey
  if (!dayKey) return ''
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  const parts = dayKey.split('-')
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  return `${months[month - 1]} ${day}, ${year}`
})
</script>

<style scoped>
.moh-wotd-definition :deep(p) {
  margin: 0 0 0.75rem 0;
}
.moh-wotd-definition :deep(p:last-child) {
  margin-bottom: 0;
}
.moh-wotd-definition :deep(strong),
.moh-wotd-definition :deep(b) {
  font-weight: 700;
}
.moh-wotd-definition :deep(em),
.moh-wotd-definition :deep(i) {
  font-style: italic;
}
</style>
