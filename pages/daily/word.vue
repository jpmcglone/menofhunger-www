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
            <div v-if="definitionHtml" class="moh-wotd-definition moh-text text-base leading-relaxed" v-html="definitionHtml" />
            <div v-else class="moh-text space-y-3 text-base leading-relaxed">
              <p v-for="(p, idx) in paragraphs" :key="idx" class="whitespace-pre-wrap">{{ p }}</p>
            </div>
          </div>

          <!-- Like button + day label row -->
          <div class="mt-10 flex items-center justify-between gap-4">
            <p v-if="dayLabel" class="text-xs text-gray-400 dark:text-gray-500">
              {{ dayLabel }}
            </p>
            <AppWotdLikeButton
              v-if="data"
              :initial-count="likeCount"
              :initial-liked="viewerHasLiked"
              @like-toggled="onLikeToggled"
            />
          </div>

          <!-- Countdown to next word -->
          <p v-if="countdown" class="mt-3 text-[11px] moh-text-muted tabular-nums select-none">
            Next word in {{ countdown }}
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
import type { WotdLikeToggle } from '~/types/api'
import { siteConfig } from '~/config/site'

definePageMeta({
  layout: 'app',
  hideTopBar: true,
})

const { user: authUser } = useAuth()
const { markReadByKind } = useNotifications()
const { addNotificationsCallback, removeNotificationsCallback, addDailyContentCallback, removeDailyContentCallback } = usePresence()

const { data, refresh: refreshWord } = await useWebsters1828Wotd()

// Also warm the daily-content cache (used by the right rail) so it doesn't double-fetch.
const { data: dailyContent, refresh: refreshDailyContent } = await useDailyContentToday()

// Like state — synced from the WOTD response
const likeCount = ref(data.value?.likeCount ?? 0)
const viewerHasLiked = ref(data.value?.viewerHasLiked ?? false)

watch(() => data.value, (wotd) => {
  if (wotd) {
    likeCount.value = wotd.likeCount
    viewerHasLiked.value = wotd.viewerHasLiked
  }
})

function onLikeToggled(result: WotdLikeToggle) {
  likeCount.value = result.likeCount
  viewerHasLiked.value = result.liked
}

// --- OG / social metadata ---
const ogTitle = computed(() =>
  data.value?.word
    ? `${data.value.word.charAt(0).toUpperCase() + data.value.word.slice(1)}: Word of the Day`
    : 'Word of the Day',
)
const ogDescription = computed(() => {
  const def = data.value?.definition ?? null
  if (!def) return `Today's word from Webster's 1828 Dictionary, brought to you by ${siteConfig.name}.`
  return def.replace(/<[^>]+>/g, '').slice(0, 200).trim()
})

useSeoMeta({
  title: () => `${ogTitle.value} | ${siteConfig.name}`,
  description: () => ogDescription.value,
  ogTitle: () => ogTitle.value,
  ogDescription: () => ogDescription.value,
  ogType: 'article',
  ogUrl: `${siteConfig.url}/daily/word`,
  ogImage: `${siteConfig.url}/images/logo-black-bg.png`,
  twitterCard: 'summary_large_image',
  twitterTitle: () => ogTitle.value,
  twitterDescription: () => ogDescription.value,
  twitterImage: `${siteConfig.url}/images/logo-black-bg.png`,
  twitterSite: '@menofhunger',
})

// --- Countdown ---
const nextWordPublishAt = computed(() => dailyContent.value?.nextWordPublishAt ?? null)
const { remaining: countdown } = usePublishCountdown(nextWordPublishAt)

function clearWordNotification() {
  if (authUser.value) {
    void markReadByKind('word_of_the_day')
  }
}

async function onWordPublished() {
  await Promise.all([refreshWord(), refreshDailyContent()])
  clearWordNotification()
}

// Refetch and clear the notification when a new word_of_the_day notification arrives.
const notificationsCb = {
  onNew: (payload: any) => {
    if (payload?.notification?.kind === 'word_of_the_day') {
      void onWordPublished()
    }
  },
}

// Refetch on publish; patch like count in real time from other users' likes.
const dailyContentCb = {
  onPublished: (item: 'word' | 'quote') => {
    if (item === 'word') void onWordPublished()
  },
  onLikeUpdated: (count: number, viewerLiked: boolean) => {
    likeCount.value = count
    viewerHasLiked.value = viewerLiked
  },
}

if (import.meta.client) {
  onMounted(() => {
    addNotificationsCallback(notificationsCb as any)
    addDailyContentCallback(dailyContentCb)
    clearWordNotification()
  })
  onActivated(() => {
    clearWordNotification()
  })
  onBeforeUnmount(() => {
    removeNotificationsCallback(notificationsCb as any)
    removeDailyContentCallback(dailyContentCb)
  })
}

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
