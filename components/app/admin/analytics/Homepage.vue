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
          {{ data.landing.men.contributors.toLocaleString() }} of {{ data.landing.men.total.toLocaleString() }} verified men
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
          {{ data.landing.men.originalAuthors.toLocaleString() }} wrote at least one original post
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
              {{ data.landing.men.medianPostsPerContributor.toLocaleString() }}
            </div>
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ data.landing.posts.total.toLocaleString() }} eligible items
          ({{ data.landing.posts.original.toLocaleString() }} original · {{ data.landing.posts.replies.toLocaleString() }} replies)
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
          {{ data.landing.views.total.toLocaleString() }} total post views
          <template v-if="data.landing.views.unique != null">
            · {{ data.landing.views.unique.toLocaleString() }} people
          </template>
          ·
          {{ data.landing.posts.public.toLocaleString() }} public /
          {{ data.landing.posts.verified.toLocaleString() }} verified /
          {{ data.landing.posts.premium.toLocaleString() }} premium
        </div>
      </div>

      <div v-if="data.landing.articles" class="rounded-xl border moh-border p-4 space-y-3 sm:col-span-2 lg:col-span-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-medium text-sm">Articles</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Published landing-eligible articles (same author filters)</div>
          </div>
          <div class="text-2xl font-bold tabular-nums">
            {{ data.landing.articles.total.toLocaleString() }}
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ data.landing.articles.authors.toLocaleString() }} authors ·
          {{ data.landing.articles.views.toLocaleString() }} total views
          <template v-if="data.landing.articles.unique != null">
            · {{ data.landing.articles.unique.toLocaleString() }} people
          </template>
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
          {{ data.landing.articles.public.toLocaleString() }} public /
          {{ data.landing.articles.verified.toLocaleString() }} verified /
          {{ data.landing.articles.premium.toLocaleString() }} premium
        </div>
      </div>

      <div v-if="data.landing.board" class="rounded-xl border moh-border p-4 space-y-3 sm:col-span-2 lg:col-span-3">
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="font-medium text-sm">Board</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Landing-eligible Board posts (article posts excluded); not counted in Posts</div>
          </div>
          <div class="text-2xl font-bold tabular-nums">
            {{ data.landing.board.total.toLocaleString() }}
          </div>
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ data.landing.board.comments.toLocaleString() }} comments ·
          {{ data.landing.board.threadsThisWeek.toLocaleString() }} threads in the last 7 days ·
          {{ data.landing.board.authors.toLocaleString() }} people ·
          {{ data.landing.board.views.toLocaleString() }} total views
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
          {{ data.landing.board.public.toLocaleString() }} public /
          {{ data.landing.board.verified.toLocaleString() }} verified /
          {{ data.landing.board.premium.toLocaleString() }} premium
        </div>
      </div>
    </div>
  </div>
  </section>
</template>

<script setup lang="ts">
import type { AdminAnalytics } from '~/types/api'
import { useAdminAnalyticsContext } from '~/composables/pages/admin/useAdminAnalyticsPage'

defineProps<{ data: AdminAnalytics }>()

const {
  engagementColor,
  landingContributorPct,
  concentrationColor,
} = useAdminAnalyticsContext()
</script>

