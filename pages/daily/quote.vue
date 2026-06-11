<template>
  <AppPageContent>
    <div class="moh-gutter-x py-12">
      <div class="max-w-xl mx-auto text-center">
        <p class="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500 mb-10">
          Quote of the Day
        </p>

        <template v-if="dailyQuote">
          <figure class="space-y-6">
            <blockquote
              class="moh-serif text-2xl sm:text-3xl leading-relaxed italic text-gray-800 dark:text-gray-100"
            >
              &ldquo;{{ dailyQuote.text }}&rdquo;
            </blockquote>

            <figcaption class="space-y-1.5 text-sm">
              <p class="font-semibold text-gray-700 dark:text-gray-300">
                {{ attribution }}
              </p>
              <p v-if="dailyQuote.isParaphrase" class="text-xs text-gray-500 dark:text-gray-400">
                paraphrase
              </p>
              <p v-if="showTradition" class="text-xs text-gray-500 dark:text-gray-400">
                {{ dailyQuote.tradition }}
              </p>
            </figcaption>
          </figure>

          <div
            class="mt-10 h-px w-20 mx-auto bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-600 to-transparent"
          />

          <div class="mt-7 space-y-3">
            <p v-if="dayLabel" class="text-xs text-gray-400 dark:text-gray-500">
              {{ dayLabel }}
            </p>

            <p v-if="dailyQuote.note" class="text-xs text-gray-500 dark:text-gray-400 italic max-w-sm mx-auto leading-relaxed">
              {{ dailyQuote.note }}
            </p>

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
        <div v-else class="space-y-4 animate-pulse" aria-hidden="true">
          <div class="h-5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto w-3/4" />
          <div class="h-5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto w-5/6" />
          <div class="h-5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto w-2/3" />
          <div class="mt-6 h-3.5 bg-gray-200 dark:bg-zinc-800 rounded-full mx-auto w-36" />
        </div>
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { DailyContentToday, DailyQuote } from '~/types/api'
import { formatDailyQuoteAttribution } from '~/utils/daily-quote'

definePageMeta({
  layout: 'app',
  hideTopBar: true,
})

const { apiFetchData } = useApiClient()

const { data: dailyContent } = await useAsyncData<DailyContentToday | null>(
  'daily-content:today',
  () => apiFetchData<DailyContentToday>('/meta/daily-content/today', { method: 'GET' }),
  { default: () => null },
)

const dailyQuote = computed<DailyQuote | null>(() => dailyContent.value?.quote ?? null)
const attribution = computed(() =>
  dailyQuote.value ? formatDailyQuoteAttribution(dailyQuote.value as any) : '',
)

// For scripture kind, tradition is already part of attribution via formatDailyQuoteAttribution.
// Show it separately only for non-scripture kinds.
const showTradition = computed(
  () => dailyQuote.value?.tradition && dailyQuote.value.kind !== 'scripture',
)

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
