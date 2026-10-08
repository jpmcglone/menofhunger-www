<template>
  <section class="space-y-4">
  <AppAdminKitSectionHeading>Homepage</AppAdminKitSectionHeading>
  <!-- Landing content concentration -->
  <div v-if="data.landing" class="px-4 space-y-2">
    <div>
      <div class="font-semibold text-sm">Landing content concentration</div>
      <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
        Same all-time filters as the public homepage stats (not affected by the range picker)
      </div>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="rounded-xl border moh-border p-4 space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-medium text-sm">Contributors</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Verified men who posted or replied</div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-2xl font-bold tabular-nums" :class="engagementColor(landingContributorPct, 40, 60)">
              {{ landingContributorPct }}%
            </div>
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ formatCount(data.landing.men.contributors) }} of {{ formatCount(data.landing.men.total) }} verified men
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
          {{ formatCount(data.landing.men.originalAuthors) }} wrote at least one original post
        </div>
      </div>

      <div class="rounded-xl border moh-border p-4 space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-medium text-sm">Top author share</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Eligible content from the single most prolific author</div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-2xl font-bold tabular-nums" :class="concentrationColor(data.landing.men.topAuthorSharePercent, 35, 55)">
              {{ data.landing.men.topAuthorSharePercent }}%
            </div>
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Top 5 authors: {{ data.landing.men.top5SharePercent }}%
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
          Lower is healthier — answers “is this mostly one person?”
        </div>
      </div>

      <div class="rounded-xl border moh-border p-4 space-y-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-medium text-sm">Median contributor</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Posts + replies among men who contributed</div>
          </div>
          <div class="text-right shrink-0">
            <div class="text-2xl font-bold tabular-nums">
              {{ formatCount(data.landing.men.medianPostsPerContributor) }}
            </div>
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ formatCount(data.landing.posts.total) }} eligible items
          ({{ formatCount(data.landing.posts.original) }} original · {{ formatCount(data.landing.posts.replies) }} replies)
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
          {{ formatCount(data.landing.views.total) }} total post views
          <template v-if="data.landing.views.unique != null">
            · {{ formatCount(data.landing.views.unique) }} people
          </template>
          ·
          {{ formatCount(data.landing.posts.public) }} public /
          {{ formatCount(data.landing.posts.verified) }} verified /
          {{ formatCount(data.landing.posts.premium) }} premium
        </div>
      </div>

      <div v-if="data.landing.articles" class="rounded-xl border moh-border p-4 space-y-3 sm:col-span-2 lg:col-span-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-medium text-sm">Articles</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Published landing-eligible articles (same author filters)</div>
          </div>
          <div class="text-2xl font-bold tabular-nums">
            {{ formatCount(data.landing.articles.total) }}
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ formatCount(data.landing.articles.authors) }} authors ·
          {{ formatCount(data.landing.articles.views) }} total views
          <template v-if="data.landing.articles.unique != null">
            · {{ formatCount(data.landing.articles.unique) }} people
          </template>
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
          {{ formatCount(data.landing.articles.public) }} public /
          {{ formatCount(data.landing.articles.verified) }} verified /
          {{ formatCount(data.landing.articles.premium) }} premium
        </div>
      </div>

      <div v-if="data.landing.board" class="rounded-xl border moh-border p-4 space-y-3 sm:col-span-2 lg:col-span-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-medium text-sm">Board</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Landing-eligible Board posts (article posts excluded); not counted in Posts</div>
          </div>
          <div class="text-2xl font-bold tabular-nums">
            {{ formatCount(data.landing.board.total) }}
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ formatCount(data.landing.board.comments) }} comments ·
          {{ formatCount(data.landing.board.threadsThisWeek) }} threads in the last 7 days ·
          {{ formatCount(data.landing.board.authors) }} people ·
          {{ formatCount(data.landing.board.views) }} total views
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
          {{ formatCount(data.landing.board.public) }} public /
          {{ formatCount(data.landing.board.verified) }} verified /
          {{ formatCount(data.landing.board.premium) }} premium
        </div>
      </div>
    </div>
  </div>
  </section>
</template>

<script setup lang="ts">
import { formatCount } from '~/utils/number-format'
import type { AdminAnalytics } from '~/types/api'
import { useAdminAnalyticsContext } from '~/composables/pages/admin/useAdminAnalyticsPage'

defineProps<{ data: AdminAnalytics }>()

const {
  engagementColor,
  landingContributorPct,
  concentrationColor,
} = useAdminAnalyticsContext()
</script>

