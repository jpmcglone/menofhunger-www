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

            <!-- Countdown to next quote -->
            <p v-if="countdown" class="text-[11px] text-gray-300 dark:text-gray-600 tabular-nums select-none">
              Next quote in {{ countdown }}
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
import { siteConfig } from '~/config/site'

definePageMeta({
  layout: 'app',
  hideTopBar: true,
})

const { user: authUser } = useAuth()
const { markReadByKind } = useNotifications()
const { addNotificationsCallback, removeNotificationsCallback, addDailyContentCallback, removeDailyContentCallback } = usePresence()

const { data: dailyContent, refresh: refreshDailyContent } = await useDailyContentToday()

// --- OG / social metadata ---
const ogTitle = computed(() => {
  const q = dailyContent.value?.quote
  if (!q) return 'Quote of the Day'
  const attr = formatDailyQuoteAttribution(q as any)
  return `"${q.text.slice(0, 60)}${q.text.length > 60 ? '…' : ''}" — ${attr}`
})
const ogDescription = computed(() => {
  const q = dailyContent.value?.quote
  if (!q) return `Daily wisdom and scripture, brought to you by ${siteConfig.name}.`
  const attr = formatDailyQuoteAttribution(q as any)
  return `${q.text} — ${attr}`
})

useSeoMeta({
  title: () => `Quote of the Day | ${siteConfig.name}`,
  description: () => ogDescription.value,
  ogTitle: () => ogTitle.value,
  ogDescription: () => ogDescription.value,
  ogType: 'article',
  ogUrl: `${siteConfig.url}/daily/quote`,
  ogImage: `${siteConfig.url}/images/logo-black-bg.png`,
  twitterCard: 'summary_large_image',
  twitterTitle: () => ogTitle.value,
  twitterDescription: () => ogDescription.value,
  twitterImage: `${siteConfig.url}/images/logo-black-bg.png`,
  twitterSite: '@menofhunger',
})

// --- Countdown ---
const nextQuotePublishAt = computed(() => dailyContent.value?.nextQuotePublishAt ?? null)
const { remaining: countdown } = usePublishCountdown(nextQuotePublishAt)

function clearQuoteNotification() {
  if (authUser.value) {
    void markReadByKind('quote_of_the_day')
  }
}

async function onQuotePublished() {
  await refreshDailyContent()
  clearQuoteNotification()
}

// Refetch and clear the notification when a new quote_of_the_day notification arrives.
const notificationsCb = {
  onNew: (payload: any) => {
    if (payload?.notification?.kind === 'quote_of_the_day') {
      void onQuotePublished()
    }
  },
}

// Refetch immediately when the server broadcasts that the quote has been published.
const dailyContentCb = {
  onPublished: (item: 'word' | 'quote') => {
    if (item === 'quote') void onQuotePublished()
  },
}

if (import.meta.client) {
  onMounted(() => {
    addNotificationsCallback(notificationsCb as any)
    addDailyContentCallback(dailyContentCb)
    clearQuoteNotification()
  })
  onActivated(() => {
    clearQuoteNotification()
  })
  onBeforeUnmount(() => {
    removeNotificationsCallback(notificationsCb as any)
    removeDailyContentCallback(dailyContentCb)
  })
}

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
