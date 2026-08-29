<template>
  <AppPageContent bottom="standard">
    <div v-if="loading && !fitnessPage" class="flex items-center justify-center py-20">
      <AppLogoLoader />
    </div>

    <div v-else-if="loadError && !fitnessPage" class="moh-gutter-x py-16 text-center space-y-3">
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ loadError }}</p>
      <button type="button" class="text-sm font-medium text-orange-600 dark:text-orange-400" @click="loadPage">
        Try again
      </button>
    </div>

    <template v-else-if="fitnessPage">
      <!-- ─── This week ─────────────────────────────────────────────────── -->
      <div class="moh-gutter-x py-3">
        <div class="rounded-xl border moh-border moh-surface-2 p-4 space-y-4">
          <div class="flex items-center">
            <span class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">This week</span>
            <button
              v-if="stravaConnection"
              :disabled="syncing || stravaCooldownRemaining > 0"
              class="ml-auto p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-40"
              :title="stravaCooldownRemaining > 0 ? `Sync again in ${formatCooldown(stravaCooldownRemaining)}` : 'Sync'"
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

          <div class="grid grid-cols-3 gap-3">
            <div class="text-center">
              <div class="text-xl font-bold tabular-nums">
                <span v-if="fitnessPage.weekSummary.totalSteps > 0">{{ formatSteps(fitnessPage.weekSummary.totalSteps) }}</span>
                <span v-else class="text-gray-400 font-normal">—</span>
              </div>
              <div
                v-if="avgStepsPerDay != null"
                class="text-[10px] tabular-nums mt-0.5 text-gray-400"
              >{{ formatSteps(avgStepsPerDay) }} / day</div>
              <div class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 flex items-center justify-center gap-0.5">
                <Icon name="tabler:footprint" class="text-[11px]" aria-hidden="true" />
                <span>steps</span>
              </div>
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
          </div>

          <!-- Day bars (scrub to inspect a day's steps) -->
          <div
            class="select-none touch-none"
            @pointerdown="onWeekPointerDown"
            @pointermove="onWeekPointerMove"
            @pointerup="onWeekPointerUp"
            @pointercancel="clearInspectedDay"
            @pointerleave="clearInspectedDay"
          >
            <div class="h-4 text-[10px] tabular-nums text-center text-gray-400">
              {{ inspectedDayCaption || '\u00a0' }}
            </div>
            <div ref="weekBarsEl" class="flex items-end gap-1">
              <button
                v-for="day in fitnessPage.weekSummary.days"
                :key="day.dayKey"
                type="button"
                class="flex-1 flex flex-col items-center gap-1 pointer-events-none"
                :aria-label="dayAriaLabel(day)"
                @focus="inspectedDayKey = day.dayKey"
                @blur="clearInspectedDay"
              >
                <div
                  class="w-full rounded-sm transition-all"
                  :class="dayBarClass(day)"
                  :style="{ height: dayBarHeight(day), opacity: dayBarOpacity(day) }"
                />
                <span
                  class="text-[10px] transition-colors"
                  :class="isDayToday(day) ? 'text-white font-semibold' : 'text-gray-500 dark:text-gray-500'"
                >{{ dayLabel(day.dayKey) }}</span>
                <span
                  class="w-1 h-1 rounded-full -mt-0.5 transition-opacity"
                  :class="[accentBg, isDayToday(day) ? 'opacity-100' : 'opacity-0']"
                />
              </button>
            </div>
          </div>
          <p v-if="recoveryLine" class="text-xs text-gray-400 tabular-nums">{{ recoveryLine }}</p>
        </div>
      </div>

      <div
        v-if="fitnessPage.connections.length === 0"
        class="moh-gutter-x py-8 text-center space-y-2"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">{{ connectEmptyCopy }}</p>
        <NuxtLink
          to="/settings/fitness"
          class="inline-block text-sm font-medium text-orange-600 dark:text-orange-400"
        >
          Connect in Settings
        </NuxtLink>
      </div>
      <NuxtLink
        v-else
        to="/settings/fitness"
        class="moh-gutter-x py-2 flex items-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
      >
        <span>{{ connectionLine }}</span>
        <Icon name="tabler:chevron-right" class="ml-auto text-[14px]" />
      </NuxtLink>

      <!-- ─── Recent ───────────────────────────────────────────────────── -->
      <div>
        <div class="moh-gutter-x pt-4 pb-2 flex items-center justify-between">
          <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Recent
            <span v-if="fitnessPage.weekSummary.activityCount > 0" class="normal-case font-normal text-gray-400 ml-1">
              · {{ fitnessPage.weekSummary.activityCount }} this week
            </span>
          </div>
          <button
            v-if="hasMoreActivities"
            class="text-xs text-gray-400 hover:text-gray-200 transition-colors"
            @click="showAllActivities = !showAllActivities"
          >{{ showAllActivities ? 'Show less' : 'See all' }}</button>
        </div>

        <div v-if="fitnessPage.recentActivities.length === 0 && fitnessPage.connections.length > 0" class="moh-gutter-x py-6 text-center space-y-1">
          <p class="text-sm text-gray-500 dark:text-gray-400">No recent activities</p>
          <p class="text-xs text-gray-400">Sync to pull in your latest workouts.</p>
        </div>

        <div v-else-if="fitnessPage.recentActivities.length > 0" class="moh-divide">
          <div
            v-for="activity in displayedActivities"
            :key="activity.id"
            class="relative cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-900"
            role="link"
            tabindex="0"
            @click="onRowClick(activityHref(activity.id), $event)"
            @auxclick="onRowAuxClick(activityHref(activity.id), $event)"
            @keydown.enter.prevent="navigateTo(activityHref(activity.id))"
            @keydown.space.prevent="navigateTo(activityHref(activity.id))"
          >
            <NuxtLink
              :to="activityHref(activity.id)"
              class="absolute inset-0 z-[1]"
              tabindex="-1"
              aria-hidden="true"
            />
            <div class="relative z-[2] moh-gutter-x py-3 flex items-start gap-3">
            <!-- icon -->
            <div class="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/[0.07] flex items-center justify-center">
              <Icon :name="activityIcon(activity.activityType)" class="text-gray-600 dark:text-gray-200 text-base" />
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <span class="text-sm font-semibold capitalize">{{ activity.name || activityLabel(activity.activityType) }}</span>
                <span class="text-xs text-gray-400 flex-shrink-0">{{ formatActivityDate(activity.startedAt) }}</span>
              </div>
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
                <template v-if="activity.stepsCount != null && activity.stepsCount > 0">
                  <span class="text-gray-300 dark:text-gray-600">·</span>
                  <span class="inline-flex items-center gap-0.5" :aria-label="`${activity.stepsCount} steps`">
                    <Icon name="tabler:footprint" class="text-gray-400 text-[11px]" aria-hidden="true" />
                    {{ formatSteps(activity.stepsCount) }}
                  </span>
                </template>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── Card 2: Weight + Goal ──────────────────────────────────────── -->
      <div class="moh-gutter-x py-3">
        <div class="rounded-xl border moh-border moh-surface-2 moh-divide">

      <!-- Weight -->
      <div class="p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Weight</div>
          <div class="flex items-center gap-2">
            <AppFitnessOverflow
              v-if="fitnessPage.latestWeight"
              @share="openShare('weight', fitnessPage.latestWeight.id)"
            />
            <button
              class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              @click="showLogWeight = true"
            >
              Log weight
            </button>
          </div>
        </div>

        <!-- Current weight + delta (updates while scrubbing the chart) -->
        <div v-if="displayedWeight" class="flex items-end justify-between">
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold tabular-nums">{{ formatWeight(displayedWeight.weightKg) }}</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">{{ fitnessPage.units === 'us' ? 'lbs' : 'kg' }}</span>
          </div>
          <div class="text-right">
            <div v-if="weightDelta !== null" class="text-sm font-medium" :class="weightDeltaClass">
              {{ weightDelta > 0 ? '+' : '' }}{{ formatWeight(weightDelta / (fitnessPage.units === 'us' ? 1 / 2.20462 : 1)) }}
              {{ fitnessPage.units === 'us' ? 'lbs' : 'kg' }}
            </div>
            <div class="text-xs text-gray-400">{{ formatDate(displayedWeight.measuredAt) }}</div>
          </div>
        </div>
        <div v-else class="text-sm text-gray-500 dark:text-gray-400">
          No weight logged yet.
        </div>

        <!-- Sparkline chart -->
        <div v-if="sparklinePoints.length >= 2" class="relative">
          <AppFitnessSparkline
            :points="sparklinePoints"
            :line-path="sparklinePath"
            :area-path="sparklineAreaPath"
            :color="accentRgb"
            gradient-id="wt-grad"
            chart-label="Weight history. Drag to inspect a reading."
            @hover="hoverWeightIndex = $event"
          />
          <div class="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>{{ formatDate(fitnessPage.weightHistory.at(-1)!.measuredAt) }}</span>
            <span>{{ fitnessPage.weightHistory.length }} entries</span>
            <span>{{ formatDate(fitnessPage.weightHistory.at(0)!.measuredAt) }}</span>
          </div>
        </div>

        <div
          v-if="fitnessPage.weightHistory.length > 1"
          class="rounded-lg moh-surface-1 moh-divide overflow-hidden"
        >
          <div
            v-for="(metric, idx) in fitnessPage.weightHistory.slice(0, 5)"
            :key="metric.id"
            class="flex items-center justify-between px-3 py-2"
          >
            <div>
              <div class="text-sm font-medium tabular-nums">{{ formatWeight(metric.weightKg) }} {{ fitnessPage.units === 'us' ? 'lbs' : 'kg' }}</div>
              <div class="text-[10px] text-gray-400">{{ formatDate(metric.measuredAt) }}</div>
            </div>
            <div
              v-if="fitnessPage.weightHistory[idx + 1]"
              class="text-xs tabular-nums"
              :class="weightEntryDeltaClass(metric.weightKg, fitnessPage.weightHistory[idx + 1]!.weightKg)"
            >
              {{ weightEntryDelta(metric.weightKg, fitnessPage.weightHistory[idx + 1]!.weightKg) }}
            </div>
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
          <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Goal</div>
          <div class="flex items-center gap-2">
            <AppFitnessOverflow
              v-if="fitnessPage.activeGoal"
              @share="openShare('progress', fitnessPage.activeGoal.id)"
            />
            <button
              class="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              @click="showSetGoal = true"
            >
              {{ fitnessPage.activeGoal ? 'Edit goal' : 'Set goal' }}
            </button>
          </div>
        </div>

        <div v-if="fitnessPage.activeGoal">
          <div class="flex items-center justify-between text-xs mb-2">
            <div class="text-center">
              <div class="font-medium tabular-nums">{{ formatWeight(goalStartKg) }}</div>
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
          <div class="w-full bg-gray-200 dark:bg-zinc-700 rounded-full h-2">
            <div
              class="h-2 rounded-full transition-all"
              :class="accentBg"
              :style="{ width: `${goalProgressPercent}%` }"
            />
          </div>
          <div v-if="goalRemainingLabel" class="text-[10px] text-gray-400 mt-1">
            {{ goalRemainingLabel }}
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

      <!-- ─── Steps ──────────────────────────────────────────────────── -->
      <div
        v-if="fitnessPage.stepsHistory.length > 0"
        class="moh-gutter-x py-3"
      >
        <div class="rounded-xl border moh-border moh-surface-2 p-4 space-y-3">
          <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Steps</div>

          <div v-if="displayedSteps" class="flex items-end justify-between">
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-bold tabular-nums">{{ formatSteps(displayedSteps.stepsCount) }}</span>
              <span class="text-sm text-gray-500 dark:text-gray-400">steps</span>
            </div>
            <div class="text-right">
              <div
                v-if="stepsAvgPerDay != null && hoverStepsIndex == null"
                class="text-sm tabular-nums text-gray-400"
              >{{ formatSteps(stepsAvgPerDay) }} / day</div>
              <div class="text-xs text-gray-400">{{ formatDayKey(displayedSteps.dayKey) }}</div>
            </div>
          </div>

          <div v-if="stepsSparkline.points.length >= 2" class="relative">
            <AppFitnessSparkline
              :points="stepsSparkline.points"
              :line-path="stepsSparkline.linePath"
              :area-path="stepsSparkline.areaPath"
              color="rgb(20,184,166)"
              gradient-id="steps-grad"
              chart-label="Steps history. Drag to inspect a day."
              @hover="hoverStepsIndex = $event"
            />
            <div class="flex justify-between text-[10px] text-gray-400 mt-0.5">
              <span>{{ formatDayKey(fitnessPage.stepsHistory.at(-1)!.dayKey) }}</span>
              <span>{{ fitnessPage.stepsHistory.length }} days</span>
              <span>{{ formatDayKey(fitnessPage.stepsHistory.at(0)!.dayKey) }}</span>
            </div>
          </div>

          <div
            v-if="fitnessPage.stepsHistory.length > 1"
            class="rounded-lg moh-surface-1 moh-divide overflow-hidden"
          >
            <div
              v-for="(day, idx) in fitnessPage.stepsHistory.slice(0, 5)"
              :key="day.dayKey"
              class="flex items-center justify-between px-3 py-2"
            >
              <div>
                <div class="text-sm font-medium tabular-nums">{{ formatSteps(day.stepsCount) }} steps</div>
                <div class="text-[10px] text-gray-400">{{ formatDayKey(day.dayKey) }}</div>
              </div>
              <div
                v-if="fitnessPage.stepsHistory[idx + 1]"
                class="text-xs tabular-nums"
                :class="stepsEntryDeltaClass(day.stepsCount, fitnessPage.stepsHistory[idx + 1]!.stepsCount)"
              >
                {{ stepsEntryDelta(day.stepsCount, fitnessPage.stepsHistory[idx + 1]!.stepsCount) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── VO2 Max (separate card) ─────────────────────────────────── -->
      <div
        v-if="fitnessPage.latestVo2Max || fitnessPage.vo2maxHistory.length > 0"
        class="moh-gutter-x py-3"
      >
        <div class="rounded-xl border moh-border moh-surface-2 p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">VO2 max</div>
          <AppFitnessOverflow
            v-if="fitnessPage.latestVo2Max"
            @share="openShare('vo2max', fitnessPage.latestVo2Max.id)"
          />
        </div>

        <div v-if="displayedVo2Max" class="flex items-end justify-between">
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-bold tabular-nums">{{ displayedVo2Max.weightKg.toFixed(1) }}</span>
            <span class="text-sm text-gray-500 dark:text-gray-400">ml/kg/min</span>
          </div>
          <div class="text-right">
            <div class="text-xs font-medium" :class="vo2maxCategory(displayedVo2Max.weightKg).color">
              {{ vo2maxCategory(displayedVo2Max.weightKg).label }}
            </div>
            <div class="text-xs text-gray-400">{{ formatDate(displayedVo2Max.measuredAt) }}</div>
          </div>
        </div>
        <div v-else class="text-sm text-gray-500 dark:text-gray-400">
          No VO2 max recorded yet. Open the iOS app to sync from Apple Health.
        </div>

        <!-- VO2 sparkline -->
        <div v-if="vo2maxPoints.length >= 2" class="relative">
          <AppFitnessSparkline
            :points="vo2maxPoints"
            :line-path="vo2maxPath"
            :area-path="vo2maxAreaPath"
            color="rgb(99,102,241)"
            gradient-id="vo2-grad"
            chart-label="VO2 max history. Drag to inspect a reading."
            @hover="hoverVo2Index = $event"
          />
          <div class="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>{{ formatDate(fitnessPage.vo2maxHistory.at(-1)!.measuredAt) }}</span>
            <span>{{ fitnessPage.vo2maxHistory.length }} readings</span>
            <span>{{ formatDate(fitnessPage.vo2maxHistory.at(0)!.measuredAt) }}</span>
          </div>
        </div>
        </div>
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
import type { FitnessPage, FitnessActivityType, FitnessDailySummary, FitnessSharePreview, FitnessStepsDay, PostVisibility } from '~/types/api'
import { easternDateKey } from '~/utils/eastern-time'
import { indexAlongWidth, layoutSparkline } from '~/utils/fitness-chart'
import { getSafeUserErrorMessage } from '~/utils/api-error'
import { effectiveGoalStartKg, goalProgressPercent as computeGoalProgress } from '~/utils/fitness-goal'
import { averageStepsPerDay } from '~/utils/fitness-week'

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
const loadError = ref<string | null>(null)

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

function activityHref(id: string) {
  return `/fitness/activities/${id}`
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  return Boolean(
    el.closest(
      ['a', 'button', 'iframe', 'input', 'textarea', 'select',
        '[role="menu"]', '[role="menuitem"]', '[data-pc-section]'].join(','),
    ),
  )
}

function onRowClick(href: string, e: MouseEvent) {
  if (isInteractiveTarget(e.target)) return
  if (e.metaKey || e.ctrlKey) {
    window.open(href, '_blank')
    return
  }
  void navigateTo(href)
}

function onRowAuxClick(href: string, e: MouseEvent) {
  if (e.button !== 1) return
  if (isInteractiveTarget(e.target)) return
  e.preventDefault()
  window.open(href, '_blank')
}


// Weight log
const showLogWeight = ref(false)
const logWeightInput = ref('')
const savingWeight = ref(false)

// Goal
const showSetGoal = ref(false)
const goalTargetInput = ref('')
const savingGoal = ref(false)

// Share dialog
type ShareDialogState = { type: 'activity' | 'weight' | 'progress' | 'vo2max'; refId: string; preview: FitnessSharePreview }
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

const lastSyncedShort = computed(() => {
  const conns = fitnessPage.value?.connections ?? []
  const dates = conns.flatMap((c) => (c.lastSyncAt ? [new Date(c.lastSyncAt)] : []))
  if (dates.length === 0) return null
  const latest = new Date(Math.max(...dates.map((d) => d.getTime())))
  const elapsed = (Date.now() - latest.getTime()) / 1000
  if (elapsed < 60) return 'just now'
  if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`
  if (elapsed < 86400) return `${Math.floor(elapsed / 3600)}h ago`
  return 'yesterday'
})

const connectionLine = computed(() => {
  const conns = fitnessPage.value?.connections ?? []
  const names = conns.map((c) => (c.provider === 'strava' ? 'Strava' : 'Apple Health'))
  const unique = [...new Set(names)]
  const synced = lastSyncedShort.value
  return synced ? `${unique.join(' · ')} · synced ${synced}` : unique.join(' · ')
})

const connectEmptyCopy = computed(() =>
  fitnessPage.value?.stravaEnabled
    ? 'Connect Strava or Apple Health to see your activity.'
    : 'Connect Apple Health to see your activity.',
)

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
  loadError.value = null
  try {
    fitnessPage.value = await apiFetchData<FitnessPage>('/fitness/me')
    refreshStravaCooldown()
  } catch (e) {
    if (!fitnessPage.value) {
      loadError.value = getSafeUserErrorMessage(e, "Couldn't load your fitness data.")
    }
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
  const sign = display >= 0 ? '+' : ''
  return `${sign}${display.toFixed(1)}`
}

function weightEntryDeltaClass(current: number, previous: number): string {
  const diff = current - previous
  if (Math.abs(diff) < 0.05) return 'text-gray-400'
  return diff > 0 ? 'text-red-400' : 'text-green-500'
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

/** weight history oldest→newest for the chart */
const chartData = computed(() => {
  const history = fitnessPage.value?.weightHistory
  if (!history || history.length < 2) return []
  return [...history].reverse()
})

const weightSparkline = computed(() =>
  layoutSparkline(chartData.value.map((d) => ({
    value: d.weightKg,
    at: new Date(d.measuredAt).getTime(),
  }))),
)
const sparklinePoints = computed(() => weightSparkline.value.points)
const sparklinePath = computed(() => weightSparkline.value.linePath)
const sparklineAreaPath = computed(() => weightSparkline.value.areaPath)

// ─── VO2 Max sparkline ────────────────────────────────────────────────────────

const vo2maxChartData = computed(() => {
  const history = fitnessPage.value?.vo2maxHistory
  if (!history || history.length < 2) return []
  return [...history].reverse()
})

const vo2Sparkline = computed(() =>
  layoutSparkline(vo2maxChartData.value.map((d) => ({
    value: d.weightKg,
    at: new Date(d.measuredAt).getTime(),
  }))),
)
const vo2maxPoints = computed(() => vo2Sparkline.value.points)
const vo2maxPath = computed(() => vo2Sparkline.value.linePath)
const vo2maxAreaPath = computed(() => vo2Sparkline.value.areaPath)

// ─── Steps sparkline ──────────────────────────────────────────────────────────

const stepsChartData = computed((): FitnessStepsDay[] => {
  const history = fitnessPage.value?.stepsHistory
  if (!history || history.length < 2) return []
  return [...history].reverse()
})

const stepsSparkline = computed(() =>
  layoutSparkline(stepsChartData.value.map((d) => ({
    value: d.stepsCount,
    at: new Date(`${d.dayKey}T12:00:00Z`).getTime(),
  }))),
)

const stepsAvgPerDay = computed(() =>
  fitnessPage.value ? averageStepsPerDay(fitnessPage.value.stepsHistory) : null,
)

function stepsEntryDelta(current: number, previous: number): string {
  const diff = current - previous
  if (Math.abs(diff) < 50) return '—'
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${formatSteps(diff)}`
}

function stepsEntryDeltaClass(current: number, previous: number): string {
  const diff = current - previous
  if (Math.abs(diff) < 50) return 'text-gray-400'
  return diff > 0 ? 'text-green-500' : 'text-red-400'
}

function vo2maxCategory(value: number): { label: string; color: string } {
  if (value >= 60) return { label: 'Superior', color: 'text-indigo-500' }
  if (value >= 52) return { label: 'Excellent', color: 'text-green-500' }
  if (value >= 46) return { label: 'Good', color: 'text-green-400' }
  if (value >= 38) return { label: 'Fair', color: 'text-yellow-500' }
  if (value >= 30) return { label: 'Poor', color: 'text-orange-400' }
  return { label: 'Very poor', color: 'text-red-500' }
}

// ─── Goal ─────────────────────────────────────────────────────────────────────

const goalStartKg = computed(() => {
  const page = fitnessPage.value
  if (!page?.activeGoal) return null
  return effectiveGoalStartKg(page.activeGoal.startKg, page.weightHistory.at(-1)?.weightKg)
})

const goalProgressPercent = computed(() => {
  const page = fitnessPage.value
  if (!page?.activeGoal) return 0
  return computeGoalProgress({
    startKg: goalStartKg.value,
    targetKg: page.activeGoal.targetKg,
    currentKg: page.latestWeight?.weightKg,
  })
})

const goalRemainingLabel = computed(() => {
  const page = fitnessPage.value
  if (!page?.activeGoal || !page.latestWeight) return ''
  const { targetKg } = page.activeGoal
  if (targetKg == null) return ''
  const diff = Math.abs(page.latestWeight.weightKg - targetKg)
  const display = page.units === 'us' ? diff * 2.20462 : diff
  if (display < 0.1) return 'Goal reached!'
  return `${display.toFixed(1)} ${page.units === 'us' ? 'lbs' : 'kg'} to go · ${goalProgressPercent.value}% complete`
})

async function submitSetGoal() {
  const raw = parseFloat(goalTargetInput.value)
  if (!raw || raw <= 0) return
  const page = fitnessPage.value
  const targetKg = page?.units === 'us' ? raw / 2.20462 : raw
  const startKg = page?.activeGoal?.startKg ?? page?.latestWeight?.weightKg ?? page?.weightHistory.at(-1)?.weightKg
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
    case 'vo2max': return 'VO2 max'
    default: return ''
  }
})

function openShare(type: 'activity' | 'weight' | 'progress' | 'vo2max', refId: string) {
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
  } else if (type === 'vo2max') {
    const latest = page.vo2maxHistory.find(m => m.id === refId) ?? page.latestVo2Max
    const oldest = page.vo2maxHistory.at(-1)
    if (latest) {
      const start = oldest && oldest.id !== latest.id ? oldest : null
      preview = {
        id: 'preview',
        shareType: 'vo2max',
        snapshot: {
          type: 'vo2max',
          data: {
            vo2maxMlKgMin: latest.weightKg,
            measuredAt: latest.measuredAt,
            startVo2maxMlKgMin: start?.weightKg ?? null,
            startedAt: start?.measuredAt ?? null,
            deltaMlKgMin: start ? latest.weightKg - start.weightKg : null,
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
    else if (dialog.type === 'weight' || dialog.type === 'vo2max') body.bodyMetricId = dialog.refId
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

const recoveryLine = computed(() => {
  if (!isPremium.value) return ''
  const parts: string[] = []
  if (avgSleep.value != null) parts.push(`${avgSleep.value} hrs sleep`)
  if (avgHrv.value != null) parts.push(`${avgHrv.value} ms HRV`)
  return parts.length ? parts.join(' · ') : ''
})

const avgStepsPerDay = computed(() =>
  fitnessPage.value ? averageStepsPerDay(fitnessPage.value.weekSummary.days) : null,
)

const weekBarsEl = ref<HTMLElement | null>(null)
const inspectedDayKey = ref<string | null>(null)
const hoverWeightIndex = ref<number | null>(null)
const hoverVo2Index = ref<number | null>(null)
const hoverStepsIndex = ref<number | null>(null)

const inspectedDay = computed(() => {
  const days = fitnessPage.value?.weekSummary.days
  if (!days || !inspectedDayKey.value) return null
  return days.find((day) => day.dayKey === inspectedDayKey.value) ?? null
})

const inspectedDayCaption = computed(() => {
  const day = inspectedDay.value
  if (!day) return ''
  const steps = day.stepsCount != null && day.stepsCount > 0 ? formatSteps(day.stepsCount) : '—'
  return `${dayLabel(day.dayKey)} · ${steps} steps`
})

const displayedWeight = computed(() => {
  const idx = hoverWeightIndex.value
  if (idx != null && chartData.value[idx]) return chartData.value[idx] ?? null
  return fitnessPage.value?.latestWeight ?? null
})

const displayedVo2Max = computed(() => {
  const idx = hoverVo2Index.value
  if (idx != null && vo2maxChartData.value[idx]) return vo2maxChartData.value[idx] ?? null
  return fitnessPage.value?.latestVo2Max ?? null
})

const displayedSteps = computed(() => {
  const idx = hoverStepsIndex.value
  if (idx != null && stepsChartData.value[idx]) return stepsChartData.value[idx] ?? null
  return fitnessPage.value?.stepsHistory[0] ?? null
})

function inspectDayAtClientX(clientX: number) {
  const el = weekBarsEl.value
  const days = fitnessPage.value?.weekSummary.days
  if (!el || !days?.length) return
  const rect = el.getBoundingClientRect()
  const idx = indexAlongWidth(days.length, clientX - rect.left, rect.width)
  if (idx == null) return
  inspectedDayKey.value = days[idx]?.dayKey ?? null
}

function onWeekPointerDown(e: PointerEvent) {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  inspectDayAtClientX(e.clientX)
}

function onWeekPointerMove(e: PointerEvent) {
  inspectDayAtClientX(e.clientX)
}

function onWeekPointerUp(e: PointerEvent) {
  if (e.pointerType === 'touch' || e.pointerType === 'pen') inspectedDayKey.value = null
}

function clearInspectedDay() {
  inspectedDayKey.value = null
}

function dayBarOpacity(day: FitnessDailySummary): number {
  if (!inspectedDayKey.value) return 1
  return day.dayKey === inspectedDayKey.value ? 1 : 0.4
}

function dayAriaLabel(day: FitnessDailySummary): string {
  const name = dayLabel(day.dayKey)
  if (isDayFuture(day)) return `${name}, upcoming`
  if (day.stepsCount != null && day.stepsCount > 0) return `${name}, ${day.stepsCount} steps`
  return `${name}, no step data`
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

function formatDayKey(dayKey: string): string {
  return formatDate(`${dayKey}T12:00:00Z`)
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
