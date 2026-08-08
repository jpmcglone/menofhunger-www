<template>
  <AppPageContent bottom="standard">
    <div class="moh-gutter-x py-4 border-b moh-border">
      <h1 class="text-xl font-bold">Fitness</h1>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <AppLogoLoader />
    </div>

    <template v-else-if="fitnessPage">
      <!-- ─── Card 1: This Week + Recovery ───────────────────────────────── -->
      <div class="moh-gutter-x py-3">
        <div class="rounded-xl border moh-border moh-surface-2 p-4 space-y-4">
          <!-- Week summary header -->
          <div class="flex items-center">
            <span class="text-xs font-semibold uppercase tracking-wide" :class="accentText">This week</span>
            <span v-if="lastSyncedText" class="ml-auto text-[10px] text-gray-400 dark:text-gray-500">{{ lastSyncedText }}</span>
            <button
              v-if="stravaConnection"
              :disabled="syncing || stravaCooldownRemaining > 0"
              class="ml-2 p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-40"
              :title="stravaCooldownRemaining > 0 ? `Sync again in ${formatCooldown(stravaCooldownRemaining)}` : 'Sync Strava'"
              @click="syncStrava"
            >
              <svg
                class="w-3.5 h-3.5 transition-transform"
                :class="syncing ? 'animate-spin' : ''"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
            </button>
          </div>

          <!-- 4-stat row -->
          <div class="grid grid-cols-4 gap-3">
            <div class="text-center">
              <div class="text-xl font-bold tabular-nums">
                <span v-if="fitnessPage.weekSummary.totalSteps > 0">{{ formatSteps(fitnessPage.weekSummary.totalSteps) }}</span>
                <span v-else class="text-gray-400 font-normal">—</span>
              </div>
              <div class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">steps</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-bold tabular-nums">
                <span v-if="fitnessPage.weekSummary.totalWorkoutMinutes > 0">{{ fitnessPage.weekSummary.totalWorkoutMinutes }}</span>
                <span v-else class="text-gray-400 font-normal">—</span>
              </div>
              <div class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">min active</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-bold tabular-nums">
                <span v-if="fitnessPage.weekSummary.totalDistanceM > 0">{{ formatDistance(fitnessPage.weekSummary.totalDistanceM) }}</span>
                <span v-else class="text-gray-400 font-normal">—</span>
              </div>
              <div class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{{ fitnessPage.units === 'us' ? 'miles' : 'km' }}</div>
            </div>
            <div class="text-center">
              <div class="text-xl font-bold tabular-nums">
                <span v-if="fitnessPage.weekSummary.totalEffort > 0">{{ fitnessPage.weekSummary.totalEffort }}</span>
                <span v-else class="text-gray-400 font-normal">—</span>
              </div>
              <div class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">effort</div>
            </div>
          </div>

          <!-- Day bars (steps + active-day indicator) -->
          <div class="flex items-end gap-1">
            <div
              v-for="day in fitnessPage.weekSummary.days"
              :key="day.dayKey"
              class="flex-1 flex flex-col items-center gap-1"
            >
              <div
                class="w-full rounded-sm transition-all"
                :class="dayBarClass(day)"
                :style="{ height: dayBarHeight(day) }"
              />
              <!-- Day label — brighter for today -->
              <span
                class="text-[10px] transition-colors"
                :class="isDayToday(day) ? 'text-white font-semibold' : 'text-gray-500 dark:text-gray-500'"
              >{{ dayLabel(day.dayKey) }}</span>
              <!-- Today dot — always rendered to keep column heights equal; hidden via opacity -->
              <span
                class="w-1 h-1 rounded-full -mt-0.5 transition-opacity"
                :class="[accentBg, isDayToday(day) ? 'opacity-100' : 'opacity-0']"
              />
            </div>
          </div>
          <!-- Legend -->
          <div class="flex items-center gap-3 text-[10px] text-gray-400">
            <span><span class="inline-block w-2 h-2 rounded-sm mr-1 align-middle" :class="accentBg" />active day</span>
            <span><span class="inline-block w-2 h-2 rounded-sm mr-1 align-middle bg-gray-300 dark:bg-zinc-600" />no data</span>
          </div>

          <!-- Recovery strip (premium: sleep + HRV) — inside the same card -->
          <div v-if="recoveryDays.length > 0" class="pt-1 border-t moh-border">
            <div class="text-xs font-semibold uppercase tracking-wide mb-2" :class="accentText">
              Recovery (7-day avg)
            </div>
            <div class="flex gap-6">
              <div v-if="avgSleep !== null">
                <span class="text-base font-bold tabular-nums">{{ avgSleep }}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">hrs sleep</span>
              </div>
              <div v-if="avgHrv !== null">
                <span class="text-base font-bold tabular-nums">{{ avgHrv }}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">ms HRV</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── No connections CTA (nothing connected yet) ─────────────── -->
      <div
        v-if="fitnessPage.connections.length === 0"
        class="moh-gutter-x py-8 text-center space-y-2 border-b moh-border"
      >
        <Icon name="tabler:heart-rate-monitor" class="text-4xl text-gray-400" />
        <p class="text-sm text-gray-600 dark:text-gray-300">
          <template v-if="fitnessPage.stravaEnabled">
            Connect Strava or Apple Health to see your activity here.
          </template>
          <template v-else>
            Connect Apple Health to see your activity here.
          </template>
        </p>
        <NuxtLink
          to="/settings/fitness"
          class="inline-block mt-2 text-sm font-medium text-orange-600 dark:text-orange-400 hover:underline"
        >
          Connect in Settings
        </NuxtLink>
      </div>

      <!-- ─── Recent activity ───────────────────────────────────────────── -->
      <div class="border-b moh-border">
        <div class="moh-gutter-x pt-4 pb-2 flex items-center justify-between">
          <div class="text-xs font-semibold uppercase tracking-wide" :class="accentText">
            Recent activity
            <span v-if="fitnessPage.weekSummary.activityCount > 0" class="normal-case font-normal text-gray-400 ml-1">
              · {{ fitnessPage.weekSummary.activityCount }} session{{ fitnessPage.weekSummary.activityCount !== 1 ? 's' : '' }} this week
            </span>
          </div>
          <button
            v-if="hasMoreActivities"
            class="text-xs text-gray-400 hover:text-gray-200 transition-colors"
            @click="showAllActivities = !showAllActivities"
          >{{ showAllActivities ? 'Show less' : 'See all' }}</button>
        </div>

        <div v-if="fitnessPage.recentActivities.length === 0" class="moh-gutter-x py-6 text-sm text-gray-500 dark:text-gray-400">
          <template v-if="fitnessPage.stravaEnabled">
            No activities yet. Sync Strava or open the iOS app to upload from Apple Health.
          </template>
          <template v-else>
            No activities yet. Open the iOS app to upload from Apple Health.
          </template>
        </div>

        <div v-else class="divide-y divide-gray-100 dark:divide-white/[0.05]">
          <div
            v-for="activity in displayedActivities"
            :key="activity.id"
            class="moh-gutter-x py-3 flex items-start gap-3"
          >
            <!-- icon -->
            <div class="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/[0.07] flex items-center justify-center">
              <Icon :name="activityIcon(activity.activityType)" class="text-gray-600 dark:text-gray-200 text-base" />
            </div>

            <!-- content -->
            <div class="flex-1 min-w-0">
              <!-- Row 1: type + date + time + share -->
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="text-sm font-semibold capitalize">{{ activityLabel(activity.activityType) }}</span>
                  <!-- provider badge -->
                  <span
                    class="ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium"
                    :class="activity.provider === 'strava'
                      ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'
                      : 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'"
                  >
                    {{ activity.provider === 'strava' ? 'Strava' : 'Health' }}
                  </span>
                </div>
                <div class="flex items-center gap-3 flex-shrink-0">
                  <span class="text-xs text-gray-400">{{ formatActivityDate(activity.startedAt) }}</span>
                  <button
                    class="inline-flex items-center justify-center w-7 h-7 rounded-full text-white/60 hover:text-white transition-colors"
                    aria-label="Share activity"
                    @click="openShare('activity', activity.id)"
                  >
                    <svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
                      <path d="M12 3v10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
                      <path d="M7.5 7.5L12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="M5 11.5v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18.5v-7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Row 2: duration · distance · pace · elevation -->
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ formatDuration(activity.durationSec) }}</span>
                <template v-if="activity.distanceM">
                  <span class="text-gray-300 dark:text-gray-600">·</span>
                  <span>{{ formatDistance(activity.distanceM) }} {{ fitnessPage.units === 'us' ? 'mi' : 'km' }}</span>
                </template>
                <template v-if="activityPace(activity)">
                  <span class="text-gray-300 dark:text-gray-600">·</span>
                  <span>{{ activityPace(activity) }}<span class="text-gray-400">/{{ fitnessPage.units === 'us' ? 'mi' : 'km' }}</span></span>
                </template>
                <template v-if="activity.totalElevationM != null && activity.totalElevationM > 0">
                  <span class="text-gray-300 dark:text-gray-600">·</span>
                  <span class="flex items-center gap-0.5">
                    <Icon name="tabler:trending-up" class="text-gray-400 text-[11px]" />
                    {{ formatElevation(activity.totalElevationM) }}
                  </span>
                </template>
              </div>

              <!-- Row 3: steps · effort (if available) -->
              <div v-if="(activity.stepsCount != null && activity.stepsCount > 0) || (activity.effortScore != null && activity.effortScore > 0)" class="mt-1.5 flex items-center gap-3 flex-wrap">
                <div v-if="activity.stepsCount != null && activity.stepsCount > 0" class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Icon name="tabler:footprint" class="text-gray-400 text-[11px]" />
                  <span>{{ formatSteps(activity.stepsCount) }} steps</span>
                </div>
                <div v-if="activity.effortScore != null && activity.effortScore > 0" class="flex items-center gap-1.5">
                  <div class="flex gap-0.5">
                    <span
                      v-for="i in 5"
                      :key="i"
                      class="inline-block w-1.5 h-2.5 rounded-sm"
                      :class="i <= effortLevel(activity.effortScore) ? effortDotColor(activity.effortScore) : 'bg-gray-200 dark:bg-zinc-700'"
                    />
                  </div>
                  <span class="text-[10px] text-gray-400">{{ effortLabel(activity.effortScore) }}</span>
                </div>
              </div>

              <!-- Row 4: calories · avg HR · max HR -->
              <div v-if="activity.calories != null || activity.avgHeartrate != null || activity.maxHeartrate != null" class="mt-1.5 flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                <div v-if="activity.calories != null" class="flex items-center gap-1">
                  <Icon name="tabler:flame" class="text-orange-400 text-[11px]" />
                  <span>{{ Math.round(activity.calories) }} kcal</span>
                </div>
                <template v-if="activity.avgHeartrate != null || activity.maxHeartrate != null">
                  <div class="flex items-center gap-1">
                    <Icon name="tabler:heart-rate-monitor" class="text-red-400 text-[11px]" />
                    <span>avg <span class="font-medium text-gray-700 dark:text-gray-300">{{ activity.avgHeartrate != null ? Math.round(activity.avgHeartrate) : '--' }}</span></span>
                    <span class="text-gray-300 dark:text-gray-600">/</span>
                    <span>max <span class="font-medium text-gray-700 dark:text-gray-300">{{ activity.maxHeartrate != null ? Math.round(activity.maxHeartrate) : '--' }}</span></span>
                    <span class="text-[10px] text-gray-400">bpm</span>
                  </div>
                </template>
              </div>
            </div>
          </div>
          <!-- Bottom "See all" / "Show less" button -->
          <div v-if="hasMoreActivities" class="py-2 flex justify-center">
            <button
              class="text-xs text-gray-500 dark:text-gray-500 hover:text-gray-300 dark:hover:text-gray-300 px-3 py-1 rounded transition-colors"
              @click="showAllActivities = !showAllActivities"
            >{{ showAllActivities ? 'Show less' : 'See all activities' }}</button>
          </div>
        </div>
      </div>

      <!-- ─── Card 2: Weight + Goal ──────────────────────────────────────── -->
      <div class="moh-gutter-x py-3">
        <div class="rounded-xl border moh-border moh-surface-2 divide-y moh-border">

      <!-- Weight -->
      <div class="p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-xs font-semibold uppercase tracking-wide" :class="accentText">Weight</div>
          <div class="flex items-center gap-3">
            <button
              v-if="fitnessPage.latestWeight"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full text-white/60 hover:text-white transition-colors"
              aria-label="Share weight"
              @click="openShare('weight', fitnessPage!.latestWeight!.id)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
                <path d="M12 3v10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
                <path d="M7.5 7.5L12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M5 11.5v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18.5v-7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button
              class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              @click="showLogWeight = true"
            >
              Log weight
            </button>
          </div>
        </div>

        <!-- Current weight + delta -->
        <div v-if="fitnessPage.latestWeight" class="flex items-end justify-between">
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold tabular-nums">{{ formatWeight(fitnessPage.latestWeight.weightKg) }}</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ fitnessPage.units === 'us' ? 'lbs' : 'kg' }}</span>
          </div>
          <div class="text-right">
            <div v-if="weightDelta !== null" class="text-sm font-medium" :class="weightDeltaClass">
              {{ weightDelta > 0 ? '+' : '' }}{{ formatWeight(weightDelta / (fitnessPage.units === 'us' ? 1 / 2.20462 : 1)) }}
              {{ fitnessPage.units === 'us' ? 'lbs' : 'kg' }}
            </div>
            <div class="text-xs text-gray-400">{{ formatDate(fitnessPage.latestWeight.measuredAt) }}</div>
          </div>
        </div>
        <div v-else class="text-sm text-gray-500 dark:text-gray-400">
          No weight logged yet.
        </div>

        <!-- Sparkline chart -->
        <div v-if="sparklinePoints.length >= 2" class="relative">
          <svg
            viewBox="0 0 300 60"
            preserveAspectRatio="none"
            class="w-full h-14"
            aria-hidden="true"
          >
            <!-- gradient area fill -->
            <defs>
              <linearGradient id="wt-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" :stop-color="accentRgb" stop-opacity="0.25" />
                <stop offset="100%" :stop-color="accentRgb" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path :d="sparklineAreaPath" fill="url(#wt-grad)" />
            <path :d="sparklinePath" fill="none" :stroke="accentRgb" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <!-- latest dot -->
            <circle v-if="sparklinePoints.length" :cx="sparklinePoints.at(-1)!.x" :cy="sparklinePoints.at(-1)!.y" r="3" :fill="accentRgb" />
          </svg>
          <div class="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>{{ formatDate(fitnessPage.weightHistory.at(-1)!.measuredAt) }}</span>
            <span>{{ fitnessPage.weightHistory.length }} entries</span>
            <span>{{ formatDate(fitnessPage.weightHistory.at(0)!.measuredAt) }}</span>
          </div>
        </div>

        <!-- Log weight form (inline) -->
        <div v-if="showLogWeight" class="pt-2 space-y-2">
          <div class="flex items-center gap-2">
            <input
              v-model="logWeightInput"
              type="number"
              step="0.1"
              min="1"
              :placeholder="fitnessPage.units === 'us' ? 'Weight (lbs)' : 'Weight (kg)'"
              class="flex-1 rounded-lg border moh-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              @keydown.enter="submitLogWeight"
            />
            <button
              class="px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium disabled:opacity-50"
              :disabled="savingWeight || !logWeightInput"
              @click="submitLogWeight"
            >
              {{ savingWeight ? 'Saving…' : 'Save' }}
            </button>
            <button
              class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              @click="showLogWeight = false; logWeightInput = ''"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Goal -->
      <div class="p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-xs font-semibold uppercase tracking-wide" :class="accentText">Goal</div>
          <div class="flex items-center gap-3">
            <button
              v-if="fitnessPage.activeGoal"
              class="inline-flex items-center justify-center w-7 h-7 rounded-full text-white/60 hover:text-white transition-colors"
              aria-label="Share progress"
              @click="openShare('progress', fitnessPage!.activeGoal!.id)"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4" aria-hidden="true">
                <path d="M12 3v10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" />
                <path d="M7.5 7.5L12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M5 11.5v7a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 18.5v-7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <button
              class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              @click="showSetGoal = true"
            >
              {{ fitnessPage.activeGoal ? 'Edit goal' : 'Set goal' }}
            </button>
          </div>
        </div>

        <div v-if="fitnessPage.activeGoal">
          <!-- Start → Current → Goal row -->
          <div class="flex items-center justify-between text-xs mb-2">
            <div class="text-center">
              <div class="font-medium tabular-nums">{{ formatWeight(fitnessPage.activeGoal.startKg) }}</div>
              <div class="text-gray-400">start</div>
            </div>
            <div class="text-center">
              <div class="font-semibold tabular-nums" :class="accentText">
                {{ fitnessPage.latestWeight ? formatWeight(fitnessPage.latestWeight.weightKg) : '—' }}
              </div>
              <div class="text-gray-400">current</div>
            </div>
            <div class="text-center">
              <div class="font-medium tabular-nums">{{ formatWeight(fitnessPage.activeGoal.targetKg) }}</div>
              <div class="text-gray-400">goal</div>
            </div>
          </div>
          <!-- Progress bar -->
          <div class="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
            <div
              class="h-2 rounded-full transition-all"
              :class="accentBg"
              :style="{ width: `${goalProgressPercent}%` }"
            />
          </div>
          <div class="flex items-center justify-between text-[10px] text-gray-400 mt-1">
            <span>{{ goalProgressPercent }}% complete</span>
            <span>{{ goalRemainingLabel }}</span>
          </div>
        </div>
        <div v-else class="text-sm text-gray-500 dark:text-gray-400">
          No active weight goal.
        </div>

        <!-- Set goal form (inline) -->
        <div v-if="showSetGoal" class="pt-2 space-y-2">
          <div class="flex items-center gap-2 flex-wrap">
            <input
              v-model="goalTargetInput"
              type="number"
              step="0.1"
              min="1"
              :placeholder="fitnessPage.units === 'us' ? 'Target (lbs)' : 'Target (kg)'"
              class="w-36 rounded-lg border moh-border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2"
              :class="accentRing"
              @keydown.enter="submitSetGoal"
            />
            <button
              class="px-3 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
              :class="accentBg"
              :disabled="savingGoal || !goalTargetInput"
              @click="submitSetGoal"
            >
              {{ savingGoal ? 'Saving…' : 'Save' }}
            </button>
            <button
              class="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              @click="showSetGoal = false; goalTargetInput = ''"
            >
              Cancel
            </button>
          </div>
        </div>
      </div><!-- /Goal -->
        </div><!-- /card inner -->
      </div><!-- /Card 2 outer -->

      <!-- ─── VO2 Max (separate card) ─────────────────────────────────── -->
      <div
        v-if="fitnessPage.latestVo2Max || fitnessPage.vo2maxHistory.length > 0"
        class="moh-gutter-x py-3"
      >
        <div class="rounded-xl border moh-border moh-surface-2 p-4 space-y-3">
        <div class="text-xs font-semibold uppercase tracking-wide" :class="accentText">VO2 Max</div>

        <div v-if="fitnessPage.latestVo2Max" class="flex items-end justify-between">
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold tabular-nums">{{ fitnessPage.latestVo2Max.weightKg.toFixed(1) }}</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">ml/kg/min</span>
          </div>
          <div class="text-right">
            <div class="text-xs font-medium" :class="vo2maxCategory(fitnessPage.latestVo2Max.weightKg).color">
              {{ vo2maxCategory(fitnessPage.latestVo2Max.weightKg).label }}
            </div>
            <div class="text-xs text-gray-400">{{ formatDate(fitnessPage.latestVo2Max.measuredAt) }}</div>
          </div>
        </div>
        <div v-else class="text-sm text-gray-500 dark:text-gray-400">
          No VO2 max recorded yet. Open the iOS app to sync from Apple Health.
        </div>

        <!-- VO2 sparkline -->
        <div v-if="vo2maxPoints.length >= 2" class="relative">
          <svg
            viewBox="0 0 300 60"
            preserveAspectRatio="none"
            class="w-full h-14"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="vo2-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgb(99,102,241)" stop-opacity="0.25" />
                <stop offset="100%" stop-color="rgb(99,102,241)" stop-opacity="0" />
              </linearGradient>
            </defs>
            <path :d="vo2maxAreaPath" fill="url(#vo2-grad)" />
            <path :d="vo2maxPath" fill="none" stroke="rgb(99,102,241)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <circle v-if="vo2maxPoints.length" :cx="vo2maxPoints.at(-1)!.x" :cy="vo2maxPoints.at(-1)!.y" r="3" fill="rgb(99,102,241)" />
          </svg>
          <div class="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>{{ formatDate(fitnessPage.vo2maxHistory.at(-1)!.measuredAt) }}</span>
            <span>{{ fitnessPage.vo2maxHistory.length }} readings</span>
            <span>{{ formatDate(fitnessPage.vo2maxHistory.at(0)!.measuredAt) }}</span>
          </div>
        </div>
        </div>
      </div>


      <!-- ─── Apple Health compact nudge ───────────────────────────────── -->
      <!-- Show only when something is connected but Apple Health is not -->
      <div
        v-if="fitnessPage.connections.length > 0 && !fitnessPage.connections.some(c => c.provider === 'apple_health')"
        class="moh-gutter-x py-3 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500"
      >
        <Icon name="tabler:brand-apple" class="text-[13px] flex-shrink-0" />
        <span>You can also connect Apple Health from the iOS app for richer data.</span>
        <NuxtLink to="/settings/fitness" class="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2 flex-shrink-0">Settings</NuxtLink>
      </div>
    </template>

    <!-- Share post modal -->
    <AppModal
      v-model="shareDialogOpen"
      :title="`Share ${shareTypeLabel}`"
      max-width-class="max-w-md"
      max-height="min(90vh, 36rem)"
      :disable-close="sharingPost"
    >
      <div class="p-4 space-y-3">
        <!-- Live preview of what will be shared -->
        <AppFitnessShareCard v-if="shareDialog?.preview" :share="shareDialog.preview" />

        <!-- Caption -->
        <textarea
          v-model="shareBody"
          placeholder="Add a caption… (optional)"
          rows="3"
          class="w-full rounded-lg border moh-border bg-transparent px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
          :class="accentRing"
          autofocus
        />
      </div>

      <template #footer>
        <div class="flex items-center justify-between gap-3">
          <AppComposerVisibilityPicker
            v-model="shareVisibility"
            :allowed="allowedVisibilities"
            :viewer-is-verified="isVerified"
            :is-premium="isPremium"
          />
          <div class="flex items-center gap-3">
            <button
              class="text-sm moh-text-muted hover:moh-text transition-colors"
              :disabled="sharingPost"
              @click="shareDialogOpen = false"
            >
              Cancel
            </button>
            <button
              class="px-4 py-2 rounded-xl text-white text-sm font-semibold disabled:opacity-50 transition-all"
              :class="sharePostBtnClass"
              :disabled="sharingPost"
              @click="submitShare"
            >
              {{ sharingPost ? 'Posting…' : 'Post' }}
            </button>
          </div>
        </div>
      </template>
    </AppModal>
  </AppPageContent>
</template>

<script setup lang="ts">
import type { FitnessPage, FitnessActivityType, FitnessDailySummary, FitnessSharePreview, PostVisibility } from '~/types/api'
import { easternDateKey } from '~/utils/eastern-time'

definePageMeta({
  layout: 'app',
  requiresAuth: true,
  requiresVerified: true,
  ssr: false,
})

usePageSeo({
  title: 'Fitness',
  description: 'Your activity and progress.',
  canonicalPath: '/fitness',
  noindex: true,
})

const { apiFetchData } = useApiClient()
const toast = useAppToast()

const fitnessPage = ref<FitnessPage | null>(null)
const loading = ref(true)

const ACTIVITY_PREVIEW_COUNT = 5
const showAllActivities = ref(false)
const displayedActivities = computed(() =>
  showAllActivities.value
    ? (fitnessPage.value?.recentActivities ?? [])
    : (fitnessPage.value?.recentActivities ?? []).slice(0, ACTIVITY_PREVIEW_COUNT),
)
const hasMoreActivities = computed(
  () => (fitnessPage.value?.recentActivities.length ?? 0) > ACTIVITY_PREVIEW_COUNT,
)


// Weight log
const showLogWeight = ref(false)
const logWeightInput = ref('')
const savingWeight = ref(false)

// Goal
const showSetGoal = ref(false)
const goalTargetInput = ref('')
const savingGoal = ref(false)

// Share dialog
type ShareDialogState = { type: 'activity' | 'weight' | 'progress'; refId: string; preview: FitnessSharePreview }
const shareDialog = ref<ShareDialogState | null>(null)
const shareDialogOpen = computed({
  get: () => shareDialog.value !== null,
  set: (v: boolean) => { if (!v) shareDialog.value = null },
})
const shareBody = ref('')
const shareVisibility = ref<PostVisibility>('public')
const sharingPost = ref(false)

const { isVerified, isPremium } = useAuth()

// Tier accent: orange for premium, blue for verified
const accentRgb = computed(() => isPremium.value ? 'rgb(249,115,22)' : 'rgb(59,130,246)')
const accentText = computed(() => isPremium.value ? 'text-amber-500 dark:text-amber-400' : 'text-blue-500 dark:text-blue-400')
const accentBg = computed(() => isPremium.value ? 'bg-orange-500' : 'bg-blue-500')
const accentBarRest = computed(() => isPremium.value ? 'bg-orange-300/60 dark:bg-orange-800/50' : 'bg-blue-300/60 dark:bg-blue-800/50')
const accentRing = computed(() => isPremium.value ? 'focus:ring-orange-500' : 'focus:ring-blue-500')

const allowedVisibilities = computed<PostVisibility[]>(() => [
  'public',
  ...(isVerified.value ? ['verifiedOnly' as PostVisibility] : []),
  ...(isPremium.value ? ['premiumOnly' as PostVisibility] : []),
])

// ─── Sync ────────────────────────────────────────────────────────────────────

const syncing = ref(false)
const stravaCooldownRemaining = ref(0)
let stravaCooldownInterval: ReturnType<typeof setInterval> | null = null

const stravaConnection = computed(() =>
  fitnessPage.value?.connections.find((c) => c.provider === 'strava' && c.status === 'active'),
)

const MANUAL_SYNC_COOLDOWN_SEC = 5 * 60

function manualSyncRemainingSeconds(lastManualSyncAt: string | null | undefined): number {
  if (!lastManualSyncAt) return 0
  const elapsed = Math.floor((Date.now() - new Date(lastManualSyncAt).getTime()) / 1000)
  return Math.max(0, MANUAL_SYNC_COOLDOWN_SEC - elapsed)
}

function formatCooldown(seconds: number): string {
  if (seconds >= 60) return `${Math.ceil(seconds / 60)}m`
  return `${seconds}s`
}

function startStravaCooldown(seconds: number) {
  stravaCooldownRemaining.value = seconds
  if (stravaCooldownInterval) clearInterval(stravaCooldownInterval)
  stravaCooldownInterval = setInterval(() => {
    stravaCooldownRemaining.value = Math.max(0, stravaCooldownRemaining.value - 1)
    if (stravaCooldownRemaining.value === 0 && stravaCooldownInterval) {
      clearInterval(stravaCooldownInterval)
      stravaCooldownInterval = null
    }
  }, 1000)
}

function refreshStravaCooldown() {
  const remaining = manualSyncRemainingSeconds(stravaConnection.value?.lastManualSyncAt)
  if (remaining > 0) startStravaCooldown(remaining)
  else stravaCooldownRemaining.value = 0
}

const lastSyncedText = computed(() => {
  const conns = fitnessPage.value?.connections ?? []
  const dates = conns.flatMap((c) => (c.lastSyncAt ? [new Date(c.lastSyncAt)] : []))
  if (dates.length === 0) return null
  const latest = new Date(Math.max(...dates.map((d) => d.getTime())))
  const elapsed = (Date.now() - latest.getTime()) / 1000
  if (elapsed < 60) return 'Just now'
  if (elapsed < 3600) return `Synced ${Math.floor(elapsed / 60)}m ago`
  if (elapsed < 86400) return `Synced ${Math.floor(elapsed / 3600)}h ago`
  return 'Synced yesterday'
})

async function syncStrava() {
  if (syncing.value || stravaCooldownRemaining.value > 0) return
  syncing.value = true
  try {
    await apiFetchData<unknown>('/fitness/sync', { method: 'POST', body: { provider: 'strava' } })
    await loadPage()
    startStravaCooldown(MANUAL_SYNC_COOLDOWN_SEC)
  } catch (e: unknown) {
    toast.pushError(e, 'Sync failed')
    const msg = String((e as { data?: { message?: string } })?.data?.message ?? (e as Error)?.message ?? '')
    const match = msg.match(/(\d+) more seconds/)
    if (match) startStravaCooldown(Number(match[1]))
  } finally {
    syncing.value = false
  }
}

async function loadPage() {
  loading.value = true
  try {
    fitnessPage.value = await apiFetchData<FitnessPage>('/fitness/me')
    refreshStravaCooldown()
  } catch {
    // non-fatal
  } finally {
    loading.value = false
  }
}

onMounted(loadPage)
onActivated(loadPage)
onBeforeUnmount(() => {
  if (stravaCooldownInterval) clearInterval(stravaCooldownInterval)
})

// ─── Weight ──────────────────────────────────────────────────────────────────

function formatWeight(kg: number | null | undefined): string {
  if (kg == null) return '—'
  const page = fitnessPage.value
  if (page?.units === 'us') return (kg * 2.20462).toFixed(1)
  return kg.toFixed(1)
}

/** Delta between latest and oldest entry in the history (kg). */
const weightDelta = computed((): number | null => {
  const history = fitnessPage.value?.weightHistory
  if (!history || history.length < 2) return null
  return (history[0]?.weightKg ?? 0) - (history.at(-1)?.weightKg ?? 0)
})

const weightDeltaClass = computed(() => {
  const delta = weightDelta.value
  const goal = fitnessPage.value?.activeGoal
  if (delta == null) return 'text-gray-400'
  // If goal is to lose weight, down is good; if to gain, up is good
  const losingGoal = goal && goal.targetKg != null && goal.startKg != null && goal.targetKg < goal.startKg
  const isGood = losingGoal ? delta < 0 : delta > 0
  if (Math.abs(delta) < 0.1) return 'text-gray-400'
  return isGood ? 'text-green-500 dark:text-green-400' : 'text-red-400 dark:text-red-400'
})

function weightEntryDelta(current: number, previous: number): string {
  const page = fitnessPage.value
  const diff = current - previous
  const display = page?.units === 'us' ? diff * 2.20462 : diff
  if (Math.abs(display) < 0.05) return '—'
  return `${display > 0 ? '▲' : '▼'} ${Math.abs(display).toFixed(1)}`
}

async function submitLogWeight() {
  const raw = parseFloat(logWeightInput.value)
  if (!raw || raw <= 0) return
  const page = fitnessPage.value
  const weightKg = page?.units === 'us' ? raw / 2.20462 : raw
  savingWeight.value = true
  try {
    await apiFetchData<unknown>('/fitness/weight', { method: 'POST', body: { weightKg } })
    toast.push({ title: 'Weight logged.', tone: 'success' })
    showLogWeight.value = false
    logWeightInput.value = ''
    await loadPage()
  } catch {
    toast.push({ title: 'Failed to save weight.', tone: 'error' })
  } finally {
    savingWeight.value = false
  }
}

// ─── Weight sparkline ─────────────────────────────────────────────────────────

const W = 300
const H = 60
const PAD = 4

/** weight history oldest→newest for the chart */
const chartData = computed(() => {
  const history = fitnessPage.value?.weightHistory
  if (!history || history.length < 2) return []
  return [...history].reverse() // oldest first
})

const sparklinePoints = computed((): { x: number; y: number }[] => {
  const data = chartData.value
  if (data.length < 2) return []
  const weights = data.map((d) => d.weightKg)
  const minW = Math.min(...weights)
  const maxW = Math.max(...weights)
  const range = maxW - minW || 1
  const times = data.map((d) => new Date(d.measuredAt).getTime())
  const minT = times[0] ?? 0
  const maxT = times[times.length - 1] ?? 0
  const timeRange = maxT - minT || 1
  return data.map((d, i) => ({
    x: PAD + (((times[i] ?? 0) - minT) / timeRange) * (W - PAD * 2),
    y: (H - PAD) - ((d.weightKg - minW) / range) * (H - PAD * 2),
  }))
})

const sparklinePath = computed((): string => {
  const pts = sparklinePoints.value
  if (pts.length < 2) return ''
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
})

const sparklineAreaPath = computed((): string => {
  const pts = sparklinePoints.value
  if (pts.length < 2) return ''
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]!
  const first = pts[0]!
  return `${line} L ${last.x.toFixed(1)} ${H} L ${first.x.toFixed(1)} ${H} Z`
})

// ─── VO2 Max sparkline ────────────────────────────────────────────────────────

const vo2maxChartData = computed(() => {
  const history = fitnessPage.value?.vo2maxHistory
  if (!history || history.length < 2) return []
  return [...history].reverse() // oldest first
})

const vo2maxPoints = computed((): { x: number; y: number }[] => {
  const data = vo2maxChartData.value
  if (data.length < 2) return []
  const vals = data.map((d) => d.weightKg)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 1
  const times = data.map((d) => new Date(d.measuredAt).getTime())
  const minT = times[0] ?? 0
  const maxT = times[times.length - 1] ?? 0
  const timeRange = maxT - minT || 1
  return data.map((d, i) => ({
    x: PAD + (((times[i] ?? 0) - minT) / timeRange) * (W - PAD * 2),
    y: (H - PAD) - ((d.weightKg - minV) / range) * (H - PAD * 2),
  }))
})

const vo2maxPath = computed((): string => {
  const pts = vo2maxPoints.value
  if (pts.length < 2) return ''
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
})

const vo2maxAreaPath = computed((): string => {
  const pts = vo2maxPoints.value
  if (pts.length < 2) return ''
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]!
  const first = pts[0]!
  return `${line} L ${last.x.toFixed(1)} ${H} L ${first.x.toFixed(1)} ${H} Z`
})

function vo2maxCategory(value: number): { label: string; color: string } {
  if (value >= 60) return { label: 'Superior', color: 'text-indigo-500' }
  if (value >= 52) return { label: 'Excellent', color: 'text-green-500' }
  if (value >= 46) return { label: 'Good', color: 'text-green-400' }
  if (value >= 38) return { label: 'Fair', color: 'text-yellow-500' }
  if (value >= 30) return { label: 'Poor', color: 'text-orange-400' }
  return { label: 'Very poor', color: 'text-red-500' }
}

// ─── Goal ─────────────────────────────────────────────────────────────────────

const goalProgressPercent = computed(() => {
  const page = fitnessPage.value
  if (!page?.activeGoal) return 0
  const { startKg, targetKg } = page.activeGoal
  const currentKg = page.latestWeight?.weightKg
  if (!startKg || !currentKg || !targetKg) return 0
  const total = Math.abs(targetKg - startKg)
  if (total === 0) return 100
  return Math.min(100, Math.round((Math.abs(currentKg - startKg) / total) * 100))
})

const goalRemainingLabel = computed(() => {
  const page = fitnessPage.value
  if (!page?.activeGoal || !page.latestWeight) return ''
  const { targetKg } = page.activeGoal
  if (targetKg == null) return ''
  const diff = Math.abs(page.latestWeight.weightKg - targetKg)
  const display = page.units === 'us' ? diff * 2.20462 : diff
  if (display < 0.1) return 'Goal reached!'
  return `${display.toFixed(1)} ${page.units === 'us' ? 'lbs' : 'kg'} to go`
})

async function submitSetGoal() {
  const raw = parseFloat(goalTargetInput.value)
  if (!raw || raw <= 0) return
  const page = fitnessPage.value
  const targetKg = page?.units === 'us' ? raw / 2.20462 : raw
  const startKg = page?.latestWeight?.weightKg ?? undefined
  savingGoal.value = true
  try {
    await apiFetchData<unknown>('/fitness/goals', { method: 'PUT', body: { kind: 'weight', targetKg, startKg } })
    toast.push({ title: 'Goal saved.', tone: 'success' })
    showSetGoal.value = false
    goalTargetInput.value = ''
    await loadPage()
  } catch {
    toast.push({ title: 'Failed to save goal.', tone: 'error' })
  } finally {
    savingGoal.value = false
  }
}

// ─── Share ────────────────────────────────────────────────────────────────────

const sharePostBtnClass = computed(() => {
  switch (shareVisibility.value) {
    case 'verifiedOnly': return 'bg-blue-500 hover:bg-blue-600'
    case 'premiumOnly': return 'bg-amber-500 hover:bg-amber-600'
    default: return 'bg-gray-600 hover:bg-gray-500 dark:bg-zinc-600 dark:hover:bg-zinc-500'
  }
})

const shareTypeLabel = computed(() => {
  switch (shareDialog.value?.type) {
    case 'activity': return 'workout'
    case 'weight': return 'weight'
    case 'progress': return 'progress'
    default: return ''
  }
})

function openShare(type: 'activity' | 'weight' | 'progress', refId: string) {
  const page = fitnessPage.value
  if (!page) return

  let preview: FitnessSharePreview | null = null

  if (type === 'activity') {
    const act = page.recentActivities.find(a => a.id === refId)
    if (act) {
      preview = {
        id: 'preview',
        shareType: 'activity',
        snapshot: {
          type: 'activity',
          data: {
            activityType: act.activityType,
            startedAt: act.startedAt,
            durationSec: act.durationSec,
            distanceM: act.distanceM,
            effortScore: act.effortScore,
            stepsCount: act.stepsCount,
            calories: act.calories,
            avgHeartrate: act.avgHeartrate,
            maxHeartrate: act.maxHeartrate,
            totalElevationM: act.totalElevationM,
          },
        },
      }
    }
  } else if (type === 'weight') {
    const idx = page.weightHistory.findIndex(m => m.id === refId)
    const metric = idx >= 0 ? page.weightHistory[idx] : page.latestWeight
    if (metric) {
      const prev = idx >= 0 ? (page.weightHistory[idx + 1] ?? null) : null
      preview = {
        id: 'preview',
        shareType: 'weight',
        snapshot: {
          type: 'weight',
          data: {
            weightKg: metric.weightKg,
            measuredAt: metric.measuredAt,
            previousWeightKg: prev?.weightKg ?? null,
            deltaKg: prev ? metric.weightKg - prev.weightKg : null,
          },
        },
      }
    }
  } else if (type === 'progress') {
    const goal = page.activeGoal
    if (goal) {
      preview = {
        id: 'preview',
        shareType: 'progress',
        snapshot: {
          type: 'progress',
          data: {
            startKg: goal.startKg,
            currentKg: page.latestWeight?.weightKg ?? null,
            targetKg: goal.targetKg,
            startedAt: goal.startedAt,
          },
        },
      }
    }
  }

  if (!preview) return
  shareDialog.value = { type, refId, preview }
  shareBody.value = ''
  shareVisibility.value = 'public'
}

async function submitShare() {
  const dialog = shareDialog.value
  if (!dialog) return
  sharingPost.value = true
  try {
    const body: Record<string, unknown> = {
      shareType: dialog.type,
      body: shareBody.value,
      visibility: shareVisibility.value,
    }
    if (dialog.type === 'activity') body.activityId = dialog.refId
    else if (dialog.type === 'weight') body.bodyMetricId = dialog.refId
    else if (dialog.type === 'progress') body.goalId = dialog.refId

    const result = await apiFetchData<{ post: { id: string } }>('/fitness/share', { method: 'POST', body })
    shareDialog.value = null
    toast.push({ title: 'Posted!', to: `/p/${result.post.id}`, tone: 'success', durationMs: 6000 })
  } catch {
    toast.push({ title: 'Failed to share.', tone: 'error' })
  } finally {
    sharingPost.value = false
  }
}

// ─── Recovery strip ───────────────────────────────────────────────────────────

const recoveryDays = computed(() =>
  (fitnessPage.value?.weekSummary.days ?? []).filter(
    (d) => d.sleepMinutes != null || d.hrvMs != null,
  ),
)

const avgSleep = computed(() => {
  const withSleep = recoveryDays.value.filter((d) => d.sleepMinutes != null)
  if (withSleep.length === 0) return null
  const avg = withSleep.reduce((s, d) => s + (d.sleepMinutes ?? 0), 0) / withSleep.length
  return (avg / 60).toFixed(1)
})

const avgHrv = computed(() => {
  const withHrv = recoveryDays.value.filter((d) => d.hrvMs != null)
  if (withHrv.length === 0) return null
  return Math.round(withHrv.reduce((s, d) => s + (d.hrvMs ?? 0), 0) / withHrv.length)
})

// ─── Effort helpers ───────────────────────────────────────────────────────────

/** Strava suffer score: 0–25 easy, 26–75 moderate, 76–150 hard, 150+ max */
function effortLevel(score: number | null): number {
  if (score == null) return 0
  if (score < 25) return 1
  if (score < 75) return 2
  if (score < 150) return 3
  if (score < 250) return 4
  return 5
}

function effortLabel(score: number | null): string {
  const lvl = effortLevel(score)
  return ['', 'Easy', 'Moderate', 'Hard', 'Very hard', 'Max'][lvl] ?? ''
}

function effortDotColor(score: number | null): string {
  const lvl = effortLevel(score)
  if (lvl <= 1) return 'bg-green-400'
  if (lvl === 2) return 'bg-yellow-400'
  if (lvl === 3) return 'bg-orange-400'
  if (lvl === 4) return 'bg-orange-600'
  return 'bg-red-500'
}

// ─── Activity helpers ─────────────────────────────────────────────────────────

function activityLabel(type: FitnessActivityType): string {
  const map: Record<FitnessActivityType, string> = {
    run: 'Run', ride: 'Ride', walk: 'Walk', swim: 'Swim',
    workout: 'Workout', hike: 'Hike', yoga: 'Yoga', other: 'Activity',
  }
  return map[type] ?? type
}

/** Returns pace string (mm:ss) or null if not applicable */
function activityPace(activity: { activityType: FitnessActivityType; durationSec: number; distanceM: number | null }): string | null {
  if (!activity.distanceM || activity.distanceM < 10) return null
  const hasPace = ['run', 'walk', 'hike', 'ride'].includes(activity.activityType)
  if (!hasPace) return null
  const page = fitnessPage.value
  const distUnit = page?.units === 'us' ? activity.distanceM / 1609.34 : activity.distanceM / 1000
  if (distUnit < 0.01) return null
  const secPerUnit = activity.durationSec / distUnit
  const mins = Math.floor(secPerUnit / 60)
  const secs = Math.round(secPerUnit % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatSteps(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function formatElevation(meters: number): string {
  const page = fitnessPage.value
  if (page?.units === 'us') return `${Math.round(meters * 3.28084)} ft`
  return `${Math.round(meters)} m`
}

function formatDistance(meters: number | null): string {
  if (!meters) return '0'
  const page = fitnessPage.value
  if (page?.units === 'us') return (meters / 1609.34).toFixed(1)
  return (meters / 1000).toFixed(1)
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatActivityDate(iso: string): string {
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${dateStr} · ${timeStr}`
}

const maxSteps = computed(() => {
  if (!fitnessPage.value) return 1
  return Math.max(1, ...fitnessPage.value.weekSummary.days.map((d) => d.stepsCount ?? 0))
})

const { now } = useEasternMidnightRollover()
const todayKey = computed(() => easternDateKey(now.value))

function isDayToday(day: FitnessDailySummary): boolean {
  return day.dayKey === todayKey.value
}
function isDayFuture(day: FitnessDailySummary): boolean {
  return day.dayKey > todayKey.value
}

function dayBarClass(day: FitnessDailySummary): string {
  if ((day.workoutMinutes ?? 0) > 0) return accentBg.value
  if (isDayFuture(day)) return 'bg-gray-200/30 dark:bg-white/10'
  return 'bg-gray-300 dark:bg-zinc-600'
}

function dayBarHeight(day: FitnessDailySummary): string {
  const hasActivity = (day.workoutMinutes ?? 0) > 0
  if (isDayFuture(day)) return '4px'
  const ratio = (day.stepsCount ?? 0) / maxSteps.value
  // Active days get a minimum height bump so the color difference is obvious
  return `${hasActivity ? Math.max(12, 4 + ratio * 36) : Math.max(4, ratio * 36)}px`
}

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
function dayLabel(dayKey: string): string {
  const d = new Date(`${dayKey}T12:00:00Z`)
  return DAY_LABELS[d.getUTCDay()] ?? ''
}

function activityIcon(type: FitnessActivityType): string {
  const map: Record<FitnessActivityType, string> = {
    run: 'tabler:run',
    ride: 'tabler:bike',
    walk: 'tabler:walk',
    swim: 'tabler:wave-sine',
    workout: 'tabler:barbell',
    hike: 'tabler:mountain',
    yoga: 'tabler:activity',
    other: 'tabler:heart-rate-monitor',
  }
  return map[type] ?? 'tabler:heart-rate-monitor'
}
</script>
