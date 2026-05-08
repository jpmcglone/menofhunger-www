<template>
  <!--
    A compact strip rendered just below the main chat header when the selected
    conversation is the viewer's DM with Marv. Shows:
      - the bot badge (so the row reads as "this is an AI helper, not a real person")
      - a segmented Mode picker (Fast / Regular / Smart) that PATCHes preferences
      - a small credits chip ("1,184 credits / refill in 6h")

    This strip is realtime-aware via `useMarv()`: PATCHes update local state
    optimistically, and credit changes arrive through the `marv:credits-updated`
    websocket event registered in `useMarv.startRealtime()`.
  -->
  <div
    class="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gradient-to-r from-amber-50/50 via-rose-50/40 to-violet-50/40 px-4 py-2 dark:border-zinc-800 dark:from-amber-500/5 dark:via-rose-500/5 dark:to-violet-500/5"
    role="region"
    aria-label="Marv controls"
  >
    <!-- Mode segmented control -->
    <div
      class="inline-flex items-center rounded-full bg-gray-100 p-0.5 text-xs dark:bg-zinc-900"
      role="tablist"
      aria-label="Reply mode"
    >
      <button
        v-for="mode in (['auto', 'fast', 'regular', 'smart'] as const)"
        :key="mode"
        type="button"
        :disabled="modeBusy"
        :class="[
          'rounded-full px-2.5 py-0.5 font-semibold transition-colors',
          preferredMode === mode
            ? 'bg-white text-gray-900 shadow-sm dark:bg-zinc-700 dark:text-white'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white',
          modeBusy ? 'opacity-60' : '',
        ]"
        :title="modeTooltip(mode)"
        :aria-selected="preferredMode === mode"
        role="tab"
        @click="onPickMode(mode)"
      >
        {{ modeLabel(mode) }}
      </button>
    </div>

    <!-- Credits chip -->
    <div
      v-if="creditsLabel"
      class="ml-auto inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] tabular-nums text-gray-600 dark:border-zinc-700 dark:text-gray-300"
      :title="refillTooltip"
    >
      <Icon name="tabler:bolt" class="text-[12px] text-amber-500" aria-hidden="true" />
      <span>{{ creditsLabel }}</span>
      <span v-if="refillEtaLabel" class="text-gray-400 dark:text-gray-500">· refills in {{ refillEtaLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MarvinModeDto } from '~/types/api'

const { preferredMode, credits, setPreferredMode } = useMarv()
const modeBusy = ref(false)

function modeLabel(m: MarvinModeDto): string {
  if (m === 'auto') return 'Auto'
  if (m === 'fast') return 'Fast'
  if (m === 'smart') return 'Smart'
  return 'Regular'
}

function modeTooltip(m: MarvinModeDto): string {
  if (m === 'auto') return 'Auto — Marv picks the best model and searches the web only when needed'
  if (m === 'fast') return 'Fast — quick replies, no web search'
  if (m === 'regular') return 'Regular — balanced; may search the web for time-sensitive topics'
  return 'Smart — deepest reasoning; may search the web'
}

async function onPickMode(mode: MarvinModeDto) {
  if (modeBusy.value) return
  if (mode === preferredMode.value) return
  modeBusy.value = true
  try {
    await setPreferredMode(mode)
  } catch {
    // useMarv already restores the previous mode on failure; nothing to do here.
  } finally {
    modeBusy.value = false
  }
}

const creditsLabel = computed(() => {
  const c = credits.value
  if (!c) return null
  return `${Math.floor(c.credits).toLocaleString()} credits`
})

/**
 * Best-effort ETA until the bucket refills to ~max. Linear: time-to-fill = (max - now) / per-day-rate.
 * Returns null when already full or rate is 0/unknown.
 */
const refillEtaLabel = computed(() => {
  const c = credits.value
  if (!c) return null
  const remaining = Math.max(0, c.maxCredits - c.credits)
  if (remaining <= 0.5) return null
  if (!c.creditsPerDay || c.creditsPerDay <= 0) return null
  const hoursToFull = (remaining / c.creditsPerDay) * 24
  if (hoursToFull <= 0) return null
  if (hoursToFull < 1) {
    const mins = Math.max(1, Math.round(hoursToFull * 60))
    return `${mins}m`
  }
  if (hoursToFull < 24) return `${Math.round(hoursToFull)}h`
  const days = Math.round(hoursToFull / 24)
  return `${days}d`
})

const refillTooltip = computed(() => {
  const c = credits.value
  if (!c) return ''
  return `Up to ${c.maxCredits.toLocaleString()} credits • +${c.creditsPerDay.toLocaleString()} per day`
})
</script>
