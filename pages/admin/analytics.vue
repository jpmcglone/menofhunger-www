<template>
  <AppPageContent bottom="standard">
    <div class="py-4 space-y-6">
      <div class="px-4">
        <AppPageHeader title="Analytics" icon="tabler:chart-bar" description="KPIs, engagement trends, and monetization.">
          <template #leading>
            <Button
              class="md:hidden"
              text
              severity="secondary"
              aria-label="Back"
              @click="navigateTo('/admin')"
            >
              <template #icon>
                <Icon name="tabler:chevron-left" aria-hidden="true" />
              </template>
            </Button>
          </template>
          <template #trailing>
            <Button
              text
              severity="secondary"
              :loading="loading"
              aria-label="Refresh"
              @click="load"
            >
              <template #icon>
                <Icon name="tabler:refresh" aria-hidden="true" />
              </template>
            </Button>
          </template>
        </AppPageHeader>
      </div>

      <!-- Range selector -->
      <div class="px-4">
        <div class="inline-flex rounded-lg border moh-border overflow-hidden text-sm">
          <button
            v-for="opt in rangeOptions"
            :key="opt.value"
            class="px-3 py-1.5 font-medium transition-colors"
            :class="selectedRange === opt.value
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-800'"
            @click="setRange(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <AppInlineAlert v-if="error" severity="danger" :message="error" class="mx-4" />

      <div v-if="loading && !data" class="px-4 text-sm text-gray-500 dark:text-gray-400">Loading…</div>

      <template v-if="data">
        <!-- Summary cards -->
        <div class="px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
          <div v-for="card in summaryCards" :key="card.label" class="rounded-xl border moh-border p-4 space-y-1.5">
            <div class="text-xs text-gray-600 dark:text-gray-300 font-semibold leading-tight">{{ card.label }}</div>
            <div class="text-2xl font-bold tabular-nums leading-none">{{ card.value }}</div>
            <div v-if="card.sub" class="text-xs text-gray-500 dark:text-gray-400 leading-tight">{{ card.sub }}</div>
          </div>
        </div>

        <!-- Growth chart -->
        <div class="px-4 space-y-2">
          <div class="font-semibold text-sm">New Signups <span class="text-gray-400 font-normal">({{ rangeLabel }})</span></div>
          <div class="rounded-xl border moh-border p-4">
            <canvas ref="signupsCanvas" height="180" />
          </div>
        </div>

        <!-- Content chart -->
        <div class="px-4 space-y-2">
          <div class="font-semibold text-sm">Content Created <span class="text-gray-400 font-normal">({{ rangeLabel }})</span></div>
          <div class="rounded-xl border moh-border p-4">
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
                    <span class="font-semibold">{{ vis.count.toLocaleString() }}</span>
                  </div>
                </div>
                <div class="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                  <div class="h-full rounded-full transition-all" :class="vis.bar" :style="{ width: vis.pct + '%' }" />
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Connections chart -->
        <div class="px-4 space-y-2">
          <div class="font-semibold text-sm">Messages & Follows <span class="text-gray-400 font-normal">({{ rangeLabel }})</span></div>
          <div class="rounded-xl border moh-border p-4">
            <canvas ref="connectionsCanvas" height="180" />
          </div>
        </div>

        <!-- ─── Articles ──────────────────────────────────────────────── -->

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
                    <span class="font-semibold">{{ vis.count.toLocaleString() }}</span>
                  </div>
                </div>
                <div class="h-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden">
                  <div class="h-full rounded-full transition-all" :class="vis.bar" :style="{ width: vis.pct + '%' }" />
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Top articles table -->
        <div class="px-4 space-y-2">
          <div class="font-semibold text-sm">Top Articles by Views <span class="text-gray-400 font-normal">({{ rangeLabel }})</span></div>
          <div class="rounded-xl border moh-border overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="border-b moh-border text-left text-gray-500 dark:text-gray-400">
                  <th class="px-4 py-3 font-medium">Article</th>
                  <th class="px-4 py-3 font-medium">Tier</th>
                  <th class="px-4 py-3 font-medium text-right">Views</th>
                  <th class="px-4 py-3 font-medium text-right">Boosts</th>
                  <th class="px-4 py-3 font-medium text-right">Reactions</th>
                  <th class="px-4 py-3 font-medium text-right">Comments</th>
                  <th class="px-4 py-3 font-medium text-right">Published</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/5">
                <tr
                  v-for="article in data?.articles.topArticles"
                  :key="article.id"
                  class="hover:bg-gray-50 dark:hover:bg-zinc-900/50 cursor-pointer"
                  @click="navigateTo(`/a/${article.id}`)"
                >
                  <td class="px-4 py-3 max-w-[260px]">
                    <div class="font-medium truncate">{{ article.title }}</div>
                    <div class="text-xs text-gray-400 dark:text-gray-500">@{{ article.authorUsername }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium" :class="visibilityBadgeClass(article.visibility)">
                      {{ visibilityLabel(article.visibility) }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-right tabular-nums font-semibold">{{ article.viewCount.toLocaleString() }}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{{ article.boostCount.toLocaleString() }}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{{ article.reactionCount.toLocaleString() }}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{{ article.commentCount.toLocaleString() }}</td>
                  <td class="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{{ articleAge(article.publishedAt) }}</td>
                </tr>
                <tr v-if="!data?.articles.topArticles.length">
                  <td colspan="7" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">No published articles yet</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ─────────────────────────────────────────────────────────────── -->

        <!-- Retention table (always 10-week window) -->
        <div class="px-4 space-y-2">
          <div class="font-semibold text-sm">Weekly Cohort Retention <span class="text-gray-500 dark:text-gray-400 font-normal">(last 10 weeks)</span></div>
          <div class="rounded-xl border moh-border overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="border-b moh-border text-left text-gray-600 dark:text-gray-300">
                  <th class="px-4 py-3 font-medium">Cohort week</th>
                  <th class="px-4 py-3 font-medium text-right">Users</th>
                  <th class="px-4 py-3 font-medium text-right">W1 retained</th>
                  <th class="px-4 py-3 font-medium text-right">W1 %</th>
                  <th class="px-4 py-3 font-medium text-right">W4 retained</th>
                  <th class="px-4 py-3 font-medium text-right">W4 %</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/5">
                <tr v-for="row in retentionRows" :key="row.cohortWeek" class="hover:bg-gray-50 dark:hover:bg-zinc-900/50">
                  <td class="px-4 py-3 font-mono text-xs">{{ row.cohortWeek }}</td>
                  <td class="px-4 py-3 text-right tabular-nums">{{ row.size.toLocaleString() }}</td>
                  <td class="px-4 py-3 text-right tabular-nums">
                    <span v-if="row.isW1Eligible">{{ row.w1.toLocaleString() }}</span>
                    <span v-else class="text-gray-500 dark:text-gray-400 font-medium">--</span>
                  </td>
                  <td class="px-4 py-3 text-right tabular-nums">
                    <span v-if="row.isW1Eligible" :class="retentionColor(row.w1Pct)">{{ row.w1Pct }}%</span>
                    <span v-else class="text-gray-500 dark:text-gray-400 font-medium">--</span>
                  </td>
                  <td class="px-4 py-3 text-right tabular-nums">
                    <span v-if="row.isW4Eligible">{{ row.w4.toLocaleString() }}</span>
                    <span v-else class="text-gray-500 dark:text-gray-400 font-medium">--</span>
                  </td>
                  <td class="px-4 py-3 text-right tabular-nums">
                    <span v-if="row.isW4Eligible" :class="retentionColor(row.w4Pct)">{{ row.w4Pct }}%</span>
                    <span v-else class="text-gray-500 dark:text-gray-400 font-medium">--</span>
                  </td>
                </tr>
                <tr v-if="!retentionRows.length">
                  <td colspan="6" class="px-4 py-6 text-center text-gray-500 dark:text-gray-400 text-sm">No data yet</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Engagement health (always fixed windows) -->
        <div class="px-4 space-y-2">
          <div class="font-semibold text-sm">Engagement Health</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <!-- D30 Retention -->
            <div class="rounded-xl border moh-border p-4 space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="font-medium text-sm">D30 Retention</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Users still active 30 days after signup</div>
                </div>
                <div class="text-right shrink-0">
                  <div v-if="data.engagement.d30RetentionPct !== null" class="text-2xl font-bold tabular-nums" :class="engagementColor(data.engagement.d30RetentionPct, 20, 40)">
                    {{ data.engagement.d30RetentionPct }}%
                  </div>
                  <div v-else class="text-sm text-gray-400 dark:text-gray-500 italic">No data yet</div>
                </div>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ data.engagement.d30RetainedCount.toLocaleString() }} of {{ data.engagement.d30CohortSize.toLocaleString() }} users retained
              </div>
              <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
                Benchmark: top apps 25–40%+
              </div>
            </div>

            <!-- Activation rate -->
            <div class="rounded-xl border moh-border p-4 space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="font-medium text-sm">Activation Rate</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Active within first 7 days of signup</div>
                </div>
                <div class="text-right shrink-0">
                  <div v-if="data.engagement.activationPct !== null" class="text-2xl font-bold tabular-nums" :class="engagementColor(data.engagement.activationPct, 30, 60)">
                    {{ data.engagement.activationPct }}%
                  </div>
                  <div v-else class="text-sm text-gray-400 dark:text-gray-500 italic">No data yet</div>
                </div>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ data.engagement.activationCount.toLocaleString() }} of {{ data.engagement.activationEligibleCount.toLocaleString() }} users activated
              </div>
              <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
                Benchmark: strong apps 50–70%+
              </div>
            </div>

            <!-- Creator % -->
            <div class="rounded-xl border moh-border p-4 space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="font-medium text-sm">Creator %</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">MAU who posted or checked in (30 days)</div>
                </div>
                <div class="text-right shrink-0">
                  <div v-if="data.engagement.creatorPct !== null" class="text-2xl font-bold tabular-nums" :class="engagementColor(data.engagement.creatorPct, 15, 30)">
                    {{ data.engagement.creatorPct }}%
                  </div>
                  <div v-else class="text-sm text-gray-400 dark:text-gray-500 italic">No data yet</div>
                </div>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ data.engagement.creatorCount.toLocaleString() }} creators out of {{ data.engagement.creatorMauCount.toLocaleString() }} MAU
              </div>
              <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
                Benchmark: healthy communities 20–30%+
              </div>
            </div>

            <!-- Network density -->
            <div class="rounded-xl border moh-border p-4 space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <div class="font-medium text-sm">Network Density</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Connected users (following & followed)</div>
                </div>
                <div class="text-right shrink-0">
                  <div v-if="data.engagement.connectedUserPct !== null" class="text-2xl font-bold tabular-nums" :class="engagementColor(data.engagement.connectedUserPct, 30, 60)">
                    {{ data.engagement.connectedUserPct }}%
                  </div>
                  <div v-else class="text-sm text-gray-400 dark:text-gray-500 italic">No data yet</div>
                </div>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ data.engagement.connectedUserCount.toLocaleString() }} connected &middot; avg {{ data.engagement.avgFollowersPerUser.toLocaleString() }} followers/user
              </div>
              <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
                Higher = stronger network effect
              </div>
            </div>

            <!-- Verification → Premium funnel -->
            <div class="rounded-xl border moh-border p-4 space-y-3 sm:col-span-2">
              <div class="font-medium text-sm">Conversion Funnel</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 -mt-1">Signup → Verified → Premium</div>
              <div class="flex items-stretch gap-0 rounded-lg overflow-hidden border moh-border text-center text-sm">
                <div class="flex-1 px-3 py-3 bg-gray-50 dark:bg-zinc-900/50">
                  <div class="text-lg font-bold tabular-nums">{{ data.summary.totalUsers.toLocaleString() }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">All users</div>
                </div>
                <div class="flex items-center px-1 text-gray-300 dark:text-zinc-600 select-none">›</div>
                <div class="flex-1 px-3 py-3">
                  <div class="text-lg font-bold tabular-nums" :class="engagementColor(verifiedConversionPct, 20, 50)">
                    {{ data.summary.verifiedUsers.toLocaleString() }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Verified ({{ verifiedConversionPct }}%)</div>
                </div>
                <div class="flex items-center px-1 text-gray-300 dark:text-zinc-600 select-none">›</div>
                <div class="flex-1 px-3 py-3">
                  <div class="text-lg font-bold tabular-nums" :class="engagementColor(premiumOfVerifiedPct, 10, 30)">
                    {{ data.summary.premiumUsers.toLocaleString() }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Premium ({{ premiumOfVerifiedPct }}% of verified)</div>
                </div>
              </div>
              <div class="text-xs text-gray-400 dark:text-gray-500 border-t moh-border pt-2">
                Verification is required for premium access — this shows your full upgrade path.
              </div>
            </div>

          </div>
        </div>

        <!-- Monetization (always all-time) -->
        <div class="px-4 space-y-2">
          <div class="font-semibold text-sm">Tier Breakdown <span class="text-gray-400 font-normal">(all time)</span></div>
          <div class="rounded-xl border moh-border p-4 space-y-5">

            <!-- Paying subscribers -->
            <div>
              <div class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Paying (Stripe)</div>
              <div class="grid grid-cols-3 gap-3 text-center">
                <div class="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-3">
                  <div class="text-2xl font-bold tabular-nums text-green-700 dark:text-green-400">{{ totalPaying.toLocaleString() }}</div>
                  <div class="text-xs text-green-600 dark:text-green-500 mt-1">Total paying</div>
                </div>
                <div class="rounded-lg border moh-border p-3">
                  <div class="text-2xl font-bold tabular-nums">{{ data.monetization.payingPremium.toLocaleString() }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Premium</div>
                </div>
                <div class="rounded-lg border moh-border p-3">
                  <div class="text-2xl font-bold tabular-nums">{{ data.monetization.payingPremiumPlus.toLocaleString() }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Premium+</div>
                </div>
              </div>
            </div>

            <!-- Comped -->
            <div>
              <div class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Comped (grants)</div>
              <div class="grid grid-cols-3 gap-3 text-center">
                <div class="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
                  <div class="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">{{ totalComped.toLocaleString() }}</div>
                  <div class="text-xs text-amber-600 dark:text-amber-500 mt-1">Active comped</div>
                </div>
                <div class="rounded-lg border moh-border p-3">
                  <div class="text-2xl font-bold tabular-nums">{{ data.monetization.compedPremium.toLocaleString() }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Premium</div>
                </div>
                <div class="rounded-lg border moh-border p-3">
                  <div class="text-2xl font-bold tabular-nums">{{ data.monetization.compedPremiumPlus.toLocaleString() }}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Premium+</div>
                </div>
              </div>
              <div class="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
                <span>Users with banked free months (incl. unverified)</span>
                <span class="font-semibold tabular-nums">{{ data.summary.usersWithActiveGrants.toLocaleString() }}</span>
              </div>
            </div>

            <!-- Free -->
            <div class="flex items-center justify-between text-sm border-t moh-border pt-4">
              <span class="text-gray-500 dark:text-gray-400">Free users</span>
              <span class="font-semibold tabular-nums">{{ data.monetization.free.toLocaleString() }}</span>
            </div>

            <!-- Visual bar -->
            <div v-if="data.summary.totalUsers > 0">
              <div class="flex rounded-full overflow-hidden h-2">
                <div class="bg-gray-200 dark:bg-zinc-700" :style="{ width: freePct + '%' }" :title="`Free: ${freePct}%`" />
                <div class="bg-amber-400" :style="{ width: compedPct + '%' }" :title="`Comped: ${compedPct}%`" />
                <div class="bg-green-500" :style="{ width: payingPct + '%' }" :title="`Paying: ${payingPct}%`" />
              </div>
              <div class="flex flex-wrap gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <div class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-full bg-gray-200 dark:bg-zinc-700" />Free ({{ freePct }}%)</div>
                <div class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-full bg-amber-400" />Comped ({{ compedPct }}%)</div>
                <div class="flex items-center gap-1.5"><span class="inline-block w-3 h-3 rounded-full bg-green-500" />Paying ({{ payingPct }}%)</div>
              </div>
            </div>

            <!-- Stripe status breakdown (only if Stripe is connected) -->
            <div v-if="Object.keys(data.monetization.byStatus).length > 0" class="border-t moh-border pt-4 space-y-1">
              <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Stripe subscription status</div>
              <div
                v-for="(count, status) in data.monetization.byStatus"
                :key="status"
                class="flex items-center justify-between text-sm"
              >
                <span class="font-mono text-xs">{{ status }}</span>
                <span class="tabular-nums font-medium">{{ Number(count).toLocaleString() }}</span>
              </div>
            </div>
            <div v-else class="border-t moh-border pt-4 text-xs text-gray-400 dark:text-gray-500 italic">
              Stripe not yet connected — no subscription data available.
            </div>
          </div>
        </div>

        <div class="px-4 text-xs text-gray-400 dark:text-gray-500">
          Last updated {{ asOfDisplay }}
        </div>
      </template>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
import { Chart, registerables } from 'chart.js'
import type { AdminAnalytics, AdminAnalyticsEngagement, AdminAnalyticsTopArticle, AnalyticsGranularity, AnalyticsRange } from '~/types/api'

definePageMeta({ middleware: 'admin', layout: 'app' })

Chart.register(...registerables)

const { apiFetchData } = useApiClient()

const data = ref<AdminAnalytics | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const signupsCanvas = ref<HTMLCanvasElement | null>(null)
const contentCanvas = ref<HTMLCanvasElement | null>(null)
const connectionsCanvas = ref<HTMLCanvasElement | null>(null)

let signupsChart: Chart | null = null
let contentChart: Chart | null = null
let connectionsChart: Chart | null = null

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

// ─── Range selector ───────────────────────────────────────────────────────────

const rangeOptions: { label: string; value: AnalyticsRange }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '3M', value: '3m' },
  { label: '1Y', value: '1y' },
  { label: 'All', value: 'all' },
]

const selectedRange = ref<AnalyticsRange>('30d')

const rangeLabel = computed(() => {
  const found = rangeOptions.find((o) => o.value === selectedRange.value)
  return found?.label ?? '30D'
})

function setRange(range: AnalyticsRange) {
  if (range === selectedRange.value) return
  selectedRange.value = range
  load()
}

// ─── Data loading ─────────────────────────────────────────────────────────────

async function load() {
  loading.value = true
  error.value = null
  try {
    data.value = await apiFetchData<AdminAnalytics>(`/admin/analytics?range=${selectedRange.value}`)
    await nextTick()
    renderCharts()
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to load analytics'
  } finally {
    loading.value = false
  }
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

function formatBucket(bucket: string, granularity: AnalyticsGranularity) {
  const d = new Date(bucket + 'T00:00:00Z')
  if (granularity === 'month') {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' })
  }
  if (granularity === 'week') {
    return 'Wk ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

type SeriesPoint = { bucket: string; count: number }

/**
 * Merges sparse series onto a full selected-scope axis,
 * filling 0 for any bucket that's missing in a given series.
 */
function alignSeries(
  seriesList: SeriesPoint[][],
  granularity: AnalyticsGranularity,
  range: AnalyticsRange,
  asOfIso: string,
) {
  const sortedBuckets = buildBucketAxis(seriesList, granularity, range, asOfIso)
  const labels = sortedBuckets.map((bucket) => formatBucket(bucket, granularity))
  const counts = seriesList.map((series) => {
    const map = new Map(series.map((point) => [point.bucket, point.count]))
    return sortedBuckets.map((bucket) => map.get(bucket) ?? 0)
  })
  return { labels, counts, totalPoints: sortedBuckets.length }
}

function buildBucketAxis(
  seriesList: SeriesPoint[][],
  granularity: AnalyticsGranularity,
  range: AnalyticsRange,
  asOfIso: string,
) {
  const asOf = new Date(asOfIso)
  if (Number.isNaN(asOf.getTime())) return []

  const isAll = range === 'all'
  const rangeDays = analyticsRangeDays(range)
  let startDate: Date
  let endDate: Date

  if (isAll) {
    const allBuckets = seriesList.flatMap((series) => series.map((point) => point.bucket))
    if (allBuckets.length === 0) return []
    const sorted = [...new Set(allBuckets)].sort()
    startDate = parseUtcBucket(sorted[0]!)
    endDate = truncateToGranularity(asOf, granularity)
  } else {
    // Match backend range semantics: since = now - N days.
    const since = new Date(asOf.getTime() - (rangeDays * 86400000))
    startDate = truncateToGranularity(since, granularity)
    endDate = truncateToGranularity(asOf, granularity)
  }

  if (startDate.getTime() > endDate.getTime()) {
    const tmp = startDate
    startDate = endDate
    endDate = tmp
  }

  const buckets: string[] = []
  let cursor = new Date(startDate)
  while (cursor.getTime() <= endDate.getTime()) {
    buckets.push(toBucketKey(cursor))
    cursor = incrementBucket(cursor, granularity)
  }
  return buckets
}

function analyticsRangeDays(range: AnalyticsRange): number {
  if (range === '7d') return 7
  if (range === '30d') return 30
  if (range === '3m') return 90
  if (range === '1y') return 365
  return 0
}

function parseUtcBucket(bucket: string): Date {
  return new Date(`${bucket}T00:00:00Z`)
}

function toBucketKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function truncateToGranularity(date: Date, granularity: AnalyticsGranularity): Date {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth()
  const d = date.getUTCDate()

  if (granularity === 'month') {
    return new Date(Date.UTC(y, m, 1))
  }
  if (granularity === 'week') {
    const weekday = date.getUTCDay()
    const daysFromMonday = (weekday + 6) % 7
    return new Date(Date.UTC(y, m, d - daysFromMonday))
  }
  return new Date(Date.UTC(y, m, d))
}

function incrementBucket(date: Date, granularity: AnalyticsGranularity): Date {
  if (granularity === 'month') {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
  }
  if (granularity === 'week') {
    return new Date(date.getTime() + 7 * 86400000)
  }
  return new Date(date.getTime() + 86400000)
}

function makeLineDataset(label: string, data: number[], color: string, totalPoints: number) {
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: color + '22',
    fill: true,
    tension: 0.3,
    pointRadius: totalPoints > 60 ? 0 : 2,
    pointHoverRadius: 5,
  }
}

function chartDefaults() {
  return {
    gridColor: isDark.value ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
    tickColor: isDark.value ? '#9ca3af' : '#6b7280',
  }
}

function lineChartOptions(gridColor: string, tickColor: string) {
  return {
    responsive: true,
    maintainAspectRatio: true,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: { legend: { labels: { color: tickColor, boxWidth: 12, font: { size: 12 } } } },
    scales: {
      x: { ticks: { color: tickColor, font: { size: 11 }, maxRotation: 45 }, grid: { color: gridColor } },
      y: { beginAtZero: true, ticks: { color: tickColor, font: { size: 11 }, precision: 0 }, grid: { color: gridColor } },
    },
  }
}

function renderCharts() {
  if (!data.value) return
  const { gridColor, tickColor } = chartDefaults()
  const opts = lineChartOptions(gridColor, tickColor)
  const granularity = data.value.granularity

  if (signupsCanvas.value) {
    const { labels, counts, totalPoints } = alignSeries(
      [data.value.signups],
      granularity,
      selectedRange.value,
      data.value.asOf,
    )
    signupsChart?.destroy()
    signupsChart = new Chart(signupsCanvas.value, {
      type: 'line',
      data: {
        labels,
        datasets: [makeLineDataset('Signups', counts[0] ?? [], '#3b82f6', totalPoints)],
      },
      options: opts,
    })
  }

  if (contentCanvas.value) {
    const { labels, counts, totalPoints } = alignSeries(
      [data.value.posts, data.value.checkins, data.value.articles.published],
      granularity,
      selectedRange.value,
      data.value.asOf,
    )
    contentChart?.destroy()
    contentChart = new Chart(contentCanvas.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          makeLineDataset('Posts', counts[0] ?? [], '#10b981', totalPoints),
          makeLineDataset('Check-ins', counts[1] ?? [], '#f59e0b', totalPoints),
          makeLineDataset('Articles', counts[2] ?? [], '#a855f7', totalPoints),
        ],
      },
      options: opts,
    })
  }

  if (connectionsCanvas.value) {
    const { labels, counts, totalPoints } = alignSeries(
      [data.value.messages, data.value.follows],
      granularity,
      selectedRange.value,
      data.value.asOf,
    )
    connectionsChart?.destroy()
    connectionsChart = new Chart(connectionsCanvas.value, {
      type: 'line',
      data: {
        labels,
        datasets: [
          makeLineDataset('Messages', counts[0] ?? [], '#8b5cf6', totalPoints),
          makeLineDataset('Follows', counts[1] ?? [], '#ec4899', totalPoints),
        ],
      },
      options: opts,
    })
  }
}

// ─── Computed ─────────────────────────────────────────────────────────────────

const ARTICLE_VISIBILITY_META: Record<string, { label: string; description: string; dot: string; bar: string }> = {
  public:       { label: 'Public',       description: 'visible to everyone',    dot: 'bg-blue-500',   bar: 'bg-blue-500' },
  verifiedOnly: { label: 'Verified Only', description: 'verified members only',  dot: 'bg-violet-500', bar: 'bg-violet-500' },
  premiumOnly:  { label: 'Premium Only',  description: 'premium members only',   dot: 'bg-amber-500',  bar: 'bg-amber-500' },
}
const ARTICLE_VISIBILITY_ORDER = ['public', 'verifiedOnly', 'premiumOnly']

const articleVisibilityRows = computed(() => {
  if (!data.value) return []
  const byVis = data.value.articles.byVisibility
  const total = Object.values(byVis).reduce((a, b) => a + b, 0)
  return ARTICLE_VISIBILITY_ORDER.map((key) => {
    const count = byVis[key] ?? 0
    const meta = ARTICLE_VISIBILITY_META[key] ?? { label: key, description: '', dot: 'bg-gray-400', bar: 'bg-gray-400' }
    return { key, ...meta, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }
  })
})

const articleKpiCards = computed(() => {
  if (!data.value) return []
  const k = data.value.articles.kpis
  const r = rangeLabel.value
  return [
    { label: 'Published',   value: k.totalPublished.toLocaleString(),        sub: r },
    { label: 'Drafts',      value: k.totalDrafts.toLocaleString(),            sub: 'all time (current)' },
    { label: 'Authors',     value: k.uniqueAuthors.toLocaleString(),          sub: `published in ${r}` },
    { label: 'Views',       value: k.totalViewsInRange.toLocaleString(),      sub: r },
    { label: 'Avg Views',   value: k.avgViewsPerArticle.toLocaleString(),     sub: `per article (${r})` },
    { label: 'Boosts',      value: k.totalBoostsInRange.toLocaleString(),     sub: r },
    { label: 'Reactions',   value: k.totalReactionsInRange.toLocaleString(),  sub: r },
    { label: 'Comments',    value: k.totalCommentsInRange.toLocaleString(),   sub: r },
  ]
})

function visibilityBadgeClass(visibility: string): string {
  if (visibility === 'verifiedOnly') return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
  if (visibility === 'premiumOnly')  return 'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300'
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
}

function visibilityLabel(v: string) {
  if (v === 'verifiedOnly') return 'Verified'
  if (v === 'premiumOnly')  return 'Premium'
  return 'Public'
}

function articleAge(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

const summaryCards = computed(() => {
  if (!data.value) return []
  const { summary } = data.value
  const dauMauPct = summary.mau > 0 ? Math.round((summary.dau / summary.mau) * 100) : 0
  const verifiedPct = summary.totalUsers > 0
    ? Math.round((summary.verifiedUsers / summary.totalUsers) * 100)
    : 0
  return [
    { label: 'Total Users', value: summary.totalUsers.toLocaleString(), sub: undefined },
    { label: 'Verified', value: summary.verifiedUsers.toLocaleString(), sub: `${verifiedPct}% of all users` },
    { label: 'DAU', value: summary.dau.toLocaleString(), sub: '30-day avg' },
    { label: 'MAU', value: summary.mau.toLocaleString(), sub: '30-day window' },
    { label: 'DAU/MAU', value: dauMauPct + '%', sub: 'Stickiness' },
    { label: 'Premium', value: summary.premiumUsers.toLocaleString(), sub: `incl. ${summary.premiumPlusUsers} Premium+` },
    { label: 'Banked Grants', value: summary.usersWithActiveGrants.toLocaleString(), sub: 'users w/ free months' },
  ]
})

const VISIBILITY_META: Record<string, { label: string; description: string; dot: string; bar: string }> = {
  public:       { label: 'Public',       description: 'visible to everyone',    dot: 'bg-blue-500',   bar: 'bg-blue-500' },
  verifiedOnly: { label: 'Verified Only', description: 'verified members only',  dot: 'bg-violet-500', bar: 'bg-violet-500' },
  premiumOnly:  { label: 'Premium Only',  description: 'premium members only',   dot: 'bg-amber-500',  bar: 'bg-amber-500' },
  onlyMe:       { label: 'Only Me',       description: 'private / journal',      dot: 'bg-gray-400',   bar: 'bg-gray-400' },
}

const VISIBILITY_ORDER = ['public', 'verifiedOnly', 'premiumOnly', 'onlyMe']

const totalPostsByVisibility = computed(() => {
  if (!data.value) return 0
  return Object.values(data.value.postsByVisibility).reduce((a, b) => a + b, 0)
})

const visibilityRows = computed(() => {
  if (!data.value) return []
  const total = totalPostsByVisibility.value
  return VISIBILITY_ORDER.map((key) => {
    const count = data.value!.postsByVisibility[key] ?? 0
    const meta = VISIBILITY_META[key] ?? { label: key, description: '', dot: 'bg-gray-400', bar: 'bg-gray-400' }
    return {
      key,
      ...meta,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }
  }).filter((r) => r.count > 0 || VISIBILITY_ORDER.includes(r.key))
})

const retentionRows = computed(() => {
  if (!data.value) return []
  const now = new Date()
  return data.value.retention.map((r) => ({
    ...r,
    isW1Eligible: cohortWeeksElapsed(r.cohortWeek, now) >= 1,
    isW4Eligible: cohortWeeksElapsed(r.cohortWeek, now) >= 4,
    w1Pct: r.size > 0 ? Math.round((r.w1 / r.size) * 100) : 0,
    w4Pct: r.size > 0 ? Math.round((r.w4 / r.size) * 100) : 0,
  }))
})

function cohortWeeksElapsed(cohortWeek: string, nowDate = new Date()): number {
  const cohortTime = Date.parse(`${cohortWeek}T00:00:00Z`)
  if (Number.isNaN(cohortTime)) return Number.POSITIVE_INFINITY
  const elapsedMs = nowDate.getTime() - cohortTime
  return Math.floor(elapsedMs / (7 * 24 * 60 * 60 * 1000))
}

function retentionColor(pct: number): string {
  if (pct >= 40) return 'text-green-600 dark:text-green-400 font-semibold'
  if (pct >= 20) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
}

/** Returns a color class based on low/high thresholds for a metric */
function engagementColor(pct: number, low: number, high: number): string {
  if (pct >= high) return 'text-green-600 dark:text-green-400'
  if (pct >= low)  return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
}

const totalPaying = computed(() => {
  if (!data.value) return 0
  return data.value.monetization.payingPremium + data.value.monetization.payingPremiumPlus
})
const totalComped = computed(() => {
  if (!data.value) return 0
  return data.value.monetization.compedPremium + data.value.monetization.compedPremiumPlus
})
const freePct = computed(() => {
  if (!data.value || data.value.summary.totalUsers === 0) return 100
  return Math.round((data.value.monetization.free / data.value.summary.totalUsers) * 100)
})
const compedPct = computed(() => {
  if (!data.value || data.value.summary.totalUsers === 0) return 0
  return Math.round((totalComped.value / data.value.summary.totalUsers) * 100)
})
const payingPct = computed(() => {
  if (!data.value || data.value.summary.totalUsers === 0) return 0
  return Math.round((totalPaying.value / data.value.summary.totalUsers) * 100)
})

const verifiedConversionPct = computed(() => {
  if (!data.value || data.value.summary.totalUsers === 0) return 0
  return Math.round((data.value.summary.verifiedUsers / data.value.summary.totalUsers) * 100)
})

const premiumOfVerifiedPct = computed(() => {
  if (!data.value || data.value.summary.verifiedUsers === 0) return 0
  return Math.round((data.value.summary.premiumUsers / data.value.summary.verifiedUsers) * 100)
})

const asOfDisplay = computed(() => {
  if (!data.value) return ''
  return new Date(data.value.asOf).toLocaleString()
})

onMounted(load)
onUnmounted(() => {
  signupsChart?.destroy()
  contentChart?.destroy()
  connectionsChart?.destroy()
})
</script>
