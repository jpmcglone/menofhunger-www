<template>
  <section class="space-y-4">
  <AppAdminKitSectionHeading>Content</AppAdminKitSectionHeading>

  <!-- Content chart -->
  <div class="px-4 space-y-2">
    <div class="font-semibold text-sm">Content Created <span class="text-gray-400 font-normal">({{ rangeLabel }})</span></div>
    <div class="rounded-xl border moh-border p-4" style="touch-action: pan-y;">
      <canvas ref="contentCanvas" height="180" />
    </div>
  </div>

  <!-- Post visibility breakdown -->
  <div class="px-4 space-y-2">
    <div class="font-semibold text-sm">
      Post Visibility Breakdown
      <span class="text-gray-400 font-normal">({{ rangeLabel }}, regular posts only)</span>
    </div>
    <div class="rounded-xl border moh-border p-4 space-y-3">
      <div v-if="totalPostsByVisibility === 0" class="text-sm text-gray-400 dark:text-gray-500 italic">
        No posts in this period.
      </div>
      <template v-else>
        <div
          v-for="vis in visibilityRows"
          :key="vis.key"
          class="space-y-1"
        >
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <span class="inline-block w-2.5 h-2.5 rounded-full" :class="vis.dot" />
              <span class="font-medium">{{ vis.label }}</span>
              <span class="text-xs text-gray-400 dark:text-gray-500">{{ vis.description }}</span>
            </div>
            <div class="flex items-center gap-3 tabular-nums">
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ vis.pct }}%</span>
              <span class="font-semibold">{{ formatCount(vis.count) }}</span>
            </div>
          </div>
          <div class="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
            <div class="h-full rounded-full transition-[width]" :class="vis.bar" :style="{ width: vis.pct + '%' }" />
          </div>
        </div>
      </template>
    </div>
  </div>

  <!-- Connections chart -->
  <div class="px-4 space-y-2">
    <div class="font-semibold text-sm">Messages & Follows <span class="text-gray-400 font-normal">({{ rangeLabel }})</span></div>
    <div class="rounded-xl border moh-border p-4" style="touch-action: pan-y;">
      <canvas ref="connectionsCanvas" height="180" />
    </div>
  </div>

  <!-- Article KPI cards -->
  <div class="px-4 space-y-2">
    <div class="font-semibold text-sm">Articles <span class="text-gray-400 font-normal">({{ rangeLabel }} unless noted)</span></div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div v-for="card in articleKpiCards" :key="card.label" class="rounded-xl border moh-border p-4 space-y-1">
        <div class="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{{ card.label }}</div>
        <div class="text-2xl font-bold tabular-nums">{{ card.value }}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400">{{ card.sub }}</div>
      </div>
    </div>
  </div>

  <!-- Article visibility breakdown -->
  <div class="px-4 space-y-2">
    <div class="font-semibold text-sm">Article Visibility <span class="text-gray-400 font-normal">(published, {{ rangeLabel }})</span></div>
    <div class="rounded-xl border moh-border p-4 space-y-3">
      <div v-if="!data?.articles.byVisibility || Object.values(data.articles.byVisibility).every(v => v === 0)" class="text-sm text-gray-400 dark:text-gray-500 italic">
        No articles published yet.
      </div>
      <template v-else>
        <div v-for="vis in articleVisibilityRows" :key="vis.key" class="space-y-1">
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-2">
              <span class="inline-block w-2.5 h-2.5 rounded-full" :class="vis.dot" />
              <span class="font-medium">{{ vis.label }}</span>
              <span class="text-xs text-gray-400 dark:text-gray-500">{{ vis.description }}</span>
            </div>
            <div class="flex items-center gap-3 tabular-nums">
              <span class="text-xs text-gray-500 dark:text-gray-400">{{ vis.pct }}%</span>
              <span class="font-semibold">{{ formatCount(vis.count) }}</span>
            </div>
          </div>
          <div class="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
            <div class="h-full rounded-full transition-[width]" :class="vis.bar" :style="{ width: vis.pct + '%' }" />
          </div>
        </div>
      </template>
    </div>
  </div>

  <!-- Top articles table -->
  <div class="px-4 space-y-2">
    <div class="font-semibold text-sm">Top Articles by Views <span class="text-gray-400 font-normal">({{ rangeLabel }}, people · total)</span></div>
    <AppAdminKitTableShell>
      <thead>
        <tr class="border-b moh-border text-left text-gray-500 dark:text-gray-400">
          <th class="px-4 py-3 font-medium">Article</th>
          <th class="px-4 py-3 font-medium">Tier</th>
          <th class="px-4 py-3 font-medium text-right">People</th>
          <th class="px-4 py-3 font-medium text-right">Views</th>
          <th class="px-4 py-3 font-medium text-right">Boosts</th>
          <th class="px-4 py-3 font-medium text-right">Reactions</th>
          <th class="px-4 py-3 font-medium text-right">Replies</th>
          <th class="px-4 py-3 font-medium text-right">Published</th>
        </tr>
      </thead>
      <tbody class="moh-divide">
        <tr
          v-for="article in data?.articles.topArticles"
          :key="article.id"
          class="relative hover:bg-gray-50 dark:hover:bg-zinc-900/50 cursor-pointer"
          @click="onAnalyticsRowClick(`/a/${article.id}`, $event)"
          @auxclick="onAnalyticsRowAuxClick(`/a/${article.id}`, $event)"
        >
          <td class="px-4 py-3 max-w-[260px]">
            <!-- Background anchor for right-click "Open in new tab"; positioned relative to <tr> -->
            <NuxtLink :to="`/a/${article.id}`" class="absolute inset-0 z-0" tabindex="-1" aria-hidden="true" />
            <div class="relative z-[1] font-medium truncate">{{ article.title }}</div>
            <div class="relative z-[1] text-xs text-gray-400 dark:text-gray-500">@{{ article.authorUsername }}</div>
          </td>
          <td class="px-4 py-3">
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="visibilityBadgeClass(article.visibility)">
              {{ visibilityLabel(article.visibility) }}
            </span>
          </td>
          <td class="px-4 py-3 text-right tabular-nums font-semibold">{{ formatCount(article.uniqueViewCount ?? article.viewCount) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatCount(Math.max(article.uniqueViewCount ?? article.viewCount, article.viewCount)) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatCount(article.boostCount) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatCount(article.reactionCount) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatCount(article.commentCount) }}</td>
          <td class="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{{ articleAge(article.publishedAt) }}</td>
        </tr>
        <tr v-if="!data?.articles.topArticles.length">
          <td colspan="8" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">No published articles yet</td>
        </tr>
      </tbody>
    </AppAdminKitTableShell>
  </div>

  <!-- Board KPI cards + top threads -->
  <div class="px-4 space-y-2">
    <div class="font-semibold text-sm">Board <span class="text-gray-400 font-normal">({{ rangeLabel }} unless noted · not counted in Posts)</span></div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div v-for="card in boardKpiCards" :key="card.label" class="rounded-xl border moh-border p-4 space-y-1">
        <div class="text-xs text-gray-500 dark:text-gray-400 font-medium truncate">{{ card.label }}</div>
        <div class="text-2xl font-bold tabular-nums">{{ card.value }}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400">{{ card.sub }}</div>
      </div>
    </div>
  </div>

  <div class="px-4 space-y-2">
    <div class="font-semibold text-sm">Top Board Posts <span class="text-gray-400 font-normal">(started in {{ rangeLabel }}, by points)</span></div>
    <AppAdminKitTableShell>
      <thead>
        <tr class="border-b moh-border text-left text-gray-500 dark:text-gray-400">
          <th class="px-4 py-3 font-medium">Post</th>
          <th class="px-4 py-3 font-medium">Tier</th>
          <th class="px-4 py-3 font-medium text-right">Points</th>
          <th class="px-4 py-3 font-medium text-right">Comments</th>
          <th class="px-4 py-3 font-medium text-right">People</th>
          <th class="px-4 py-3 font-medium text-right">Views</th>
          <th class="px-4 py-3 font-medium text-right">Started</th>
        </tr>
      </thead>
      <tbody class="moh-divide">
        <tr
          v-for="thread in data?.board.topThreads"
          :key="thread.id"
          class="relative hover:bg-gray-50 dark:hover:bg-zinc-900/50 cursor-pointer"
          @click="onAnalyticsRowClick(`/b/${thread.id}`, $event)"
          @auxclick="onAnalyticsRowAuxClick(`/b/${thread.id}`, $event)"
        >
          <td class="px-4 py-3 max-w-[260px]">
            <NuxtLink :to="`/b/${thread.id}`" class="absolute inset-0 z-0" tabindex="-1" aria-hidden="true" />
            <div class="relative z-[1] font-medium truncate">{{ thread.title }}</div>
            <div class="relative z-[1] text-xs text-gray-400 dark:text-gray-500">@{{ thread.authorUsername }}</div>
          </td>
          <td class="px-4 py-3">
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="visibilityBadgeClass(thread.visibility)">
              {{ visibilityLabel(thread.visibility) }}
            </span>
          </td>
          <td class="px-4 py-3 text-right tabular-nums font-semibold">{{ formatCount(thread.boostCount) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatCount(thread.commentCount) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatCount(thread.uniqueViewCount) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatCount(thread.viewCount) }}</td>
          <td class="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{{ articleAge(thread.createdAt) }}</td>
        </tr>
        <tr v-if="!data?.board.topThreads.length">
          <td colspan="7" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">No Board posts in this range</td>
        </tr>
      </tbody>
    </AppAdminKitTableShell>
  </div>

  <!-- Top posts table -->
  <div class="px-4 space-y-2">
    <div class="font-semibold text-sm">Top Posts by Views <span class="text-gray-400 font-normal">(all time, public, people · total)</span></div>
    <AppAdminKitTableShell>
      <thead>
        <tr class="border-b moh-border text-left text-gray-500 dark:text-gray-400">
          <th class="px-4 py-3 font-medium">Post</th>
          <th class="px-4 py-3 font-medium text-right">People</th>
          <th class="px-4 py-3 font-medium text-right">Views</th>
          <th class="px-4 py-3 font-medium text-right">Boosts</th>
          <th class="px-4 py-3 font-medium text-right">Replies</th>
          <th class="px-4 py-3 font-medium text-right">Reactions</th>
          <th class="px-4 py-3 font-medium text-right">Created</th>
        </tr>
      </thead>
      <tbody class="moh-divide">
        <tr
          v-for="post in data?.topPostsAllTime"
          :key="post.id"
          class="relative hover:bg-gray-50 dark:hover:bg-zinc-900/50 cursor-pointer"
          @click="onAnalyticsRowClick(`/p/${post.id}`, $event)"
          @auxclick="onAnalyticsRowAuxClick(`/p/${post.id}`, $event)"
        >
          <td class="px-4 py-3 max-w-[420px]">
            <NuxtLink :to="`/p/${post.id}`" class="absolute inset-0 z-0" tabindex="-1" aria-hidden="true" />
            <div class="relative z-[1] line-clamp-2 font-medium">{{ post.bodyPreview || 'Untitled post' }}</div>
            <div class="relative z-[1] text-xs text-gray-400 dark:text-gray-500">@{{ post.authorUsername || 'unknown' }}</div>
          </td>
          <td class="px-4 py-3 text-right tabular-nums font-semibold">{{ formatCount(post.uniqueViewCount ?? post.viewCount) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatCount(Math.max(post.uniqueViewCount ?? post.viewCount, post.viewCount)) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatCount(post.boostCount) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatCount(post.commentCount) }}</td>
          <td class="px-4 py-3 text-right tabular-nums">{{ formatCount(post.reactionCount) }}</td>
          <td class="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{{ articleAge(post.createdAt) }}</td>
        </tr>
        <tr v-if="!data?.topPostsAllTime.length">
          <td colspan="7" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">No public posts yet</td>
        </tr>
      </tbody>
    </AppAdminKitTableShell>
  </div>
  </section>
</template>

<script setup lang="ts">
import { formatCount } from '~/utils/number-format'
import type { AdminAnalytics } from '~/types/api'
import { useAdminAnalyticsContext } from '~/composables/pages/admin/useAdminAnalyticsPage'

defineProps<{ data: AdminAnalytics }>()

const {
  rangeLabel,
  totalPostsByVisibility,
  visibilityRows,
  articleKpiCards,
  articleVisibilityRows,
  onAnalyticsRowClick,
  onAnalyticsRowAuxClick,
  visibilityBadgeClass,
  visibilityLabel,
  articleAge,
  boardKpiCards,
  contentCanvas,
  connectionsCanvas,
} = useAdminAnalyticsContext()
</script>

