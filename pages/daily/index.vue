<template>
  <AppPageContent>
    <div class="moh-gutter-x pt-8 pb-16 max-w-xl mx-auto">

      <!-- Quote of the Day ──────────────────────────────── -->
      <section class="text-center">
        <div class="flex items-center justify-between mb-8">
          <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            Quote of the Day
          </p>
          <NuxtLink
            to="/daily/quote"
            class="text-[11px] moh-text-muted hover:moh-text transition-colors"
          >
            Standalone →
          </NuxtLink>
        </div>

        <template v-if="dailyQuote">
          <figure class="space-y-6">
            <blockquote class="moh-serif text-2xl sm:text-3xl leading-relaxed italic text-gray-800 dark:text-gray-100">
              &ldquo;{{ dailyQuote.text }}&rdquo;
            </blockquote>
            <figcaption class="space-y-1.5 text-sm">
              <p class="font-semibold text-gray-700 dark:text-gray-300">
                {{ quoteAttribution }}
              </p>
              <p v-if="dailyQuote.isParaphrase" class="text-xs text-gray-500 dark:text-gray-400">
                paraphrase
              </p>
              <p v-if="showTradition" class="text-xs text-gray-500 dark:text-gray-400">
                {{ dailyQuote.tradition }}
              </p>
              <p v-if="dailyQuote.note" class="text-xs text-gray-500 dark:text-gray-400 italic max-w-sm mx-auto leading-relaxed">
                {{ dailyQuote.note }}
              </p>
            </figcaption>
          </figure>

          <div class="mt-6">
            <a
              v-if="dailyQuote.sourceUrl"
              :href="dailyQuote.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <Icon name="tabler:external-link" class="text-[11px]" aria-hidden="true" />
              Source
            </a>
          </div>
        </template>

        <!-- Loading skeleton -->
        <div v-else class="space-y-4 animate-pulse">
          <div class="h-5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto w-3/4" />
          <div class="h-5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto w-5/6" />
          <div class="h-5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto w-2/3" />
          <div class="mt-4 h-3.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto w-36" />
        </div>
      </section>

      <!-- Divider -->
      <div class="my-12 h-px w-full bg-gradient-to-r from-transparent via-gray-200 dark:via-zinc-700 to-transparent" />

      <!-- Word of the Day ──────────────────────────────── -->
      <section>
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

          <div class="flex items-center gap-3">
            <a
              v-if="wotd?.dictionaryUrl"
              :href="wotd.dictionaryUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="moh-text-muted hover:moh-text inline-flex items-center gap-1 text-xs transition-colors"
              aria-label="Open in Webster's 1828 Dictionary"
            >
              <Icon name="tabler:external-link" class="text-[11px]" aria-hidden="true" />
              Webster's 1828
            </a>
            <NuxtLink
              to="/daily/word"
              class="text-[11px] moh-text-muted hover:moh-text transition-colors"
            >
              Standalone →
            </NuxtLink>
          </div>
        </div>

        <template v-if="wotd?.word">
          <div
            class="moh-text text-4xl sm:text-5xl font-semibold tracking-tight mb-6"
            style="font-family: var(--moh-font-serif);"
          >
            {{ wotd.word }}
          </div>

          <div v-if="hasDefinition">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div v-if="definitionHtml" class="moh-wotd-definition moh-text text-[15px] leading-relaxed" v-html="definitionHtml" />
            <div v-else class="moh-text space-y-3 text-[15px] leading-relaxed">
              <p v-for="(p, idx) in paragraphs" :key="idx" class="whitespace-pre-wrap">{{ p }}</p>
            </div>
          </div>
        </template>

        <!-- Loading skeleton -->
        <div v-else class="space-y-4 animate-pulse">
          <div class="h-10 bg-gray-200 dark:bg-zinc-800 rounded w-40 mb-6" />
          <div class="h-4 bg-gray-200 dark:bg-zinc-800 rounded-full w-full" />
          <div class="h-4 bg-gray-200 dark:bg-zinc-800 rounded-full w-5/6" />
          <div class="h-4 bg-gray-200 dark:bg-zinc-800 rounded-full w-4/6" />
          <div class="h-4 bg-gray-200 dark:bg-zinc-800 rounded-full w-full" />
          <div class="h-4 bg-gray-200 dark:bg-zinc-800 rounded-full w-3/4" />
        </div>
      </section>

      <!-- Day label -->
      <p v-if="dayLabel" class="mt-12 text-xs text-gray-400 dark:text-gray-500 text-center">
        {{ dayLabel }}
      </p>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { DailyContentToday, DailyQuote, Websters1828WordOfDay } from '~/types/api'
import { formatDailyQuoteAttribution } from '~/utils/daily-quote'

definePageMeta({
  layout: 'app',
  hideTopBar: true,
})

const { apiFetchData } = useApiClient()

const [{ data: dailyContent }, { data: wotd }] = await Promise.all([
  useAsyncData<DailyContentToday | null>(
    'daily-content:today',
    () => apiFetchData<DailyContentToday>('/meta/daily-content/today', { method: 'GET' }),
    { default: () => null },
  ),
  useAsyncData<Websters1828WordOfDay | null>(
    'websters1828:wotd',
    () => apiFetchData<Websters1828WordOfDay>('/meta/websters1828/wotd?includeDefinition=1', { method: 'GET' }),
    { default: () => null },
  ),
])

// Quote
const dailyQuote = computed<DailyQuote | null>(() => dailyContent.value?.quote ?? null)
const quoteAttribution = computed(() =>
  dailyQuote.value ? formatDailyQuoteAttribution(dailyQuote.value as any) : '',
)
const showTradition = computed(
  () => dailyQuote.value?.tradition && dailyQuote.value.kind !== 'scripture',
)

// WOTD
const definitionHtml = computed(() => {
  const html = wotd.value?.definitionHtml ?? null
  return html && html.trim() ? html : null
})
const paragraphs = computed(() => {
  const def = wotd.value?.definition ?? null
  if (!def) return []
  return def.split(/\n{2,}/g).map((s) => s.trim()).filter(Boolean)
})
const hasDefinition = computed(() => Boolean(definitionHtml.value || paragraphs.value.length))

// Day label
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
