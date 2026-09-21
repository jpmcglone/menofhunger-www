<template>
  <!--
    Compact strip under the Marv DM header.
    Mode menu: Figma MARV/Mode menu (https://www.figma.com/design/YnuRSJB7p90n9jEY4mb4RN?node-id=776-1269)
  -->
  <div
    class="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gradient-to-r from-amber-50/50 via-rose-50/40 to-violet-50/40 px-4 py-2 dark:border-zinc-800 dark:from-amber-500/5 dark:via-rose-500/5 dark:to-violet-500/5"
    role="region"
    aria-label="Marv controls"
  >
    <AppMarvModeDropdown
      :model-value="preferredMode ?? 'auto'"
      :costs="me?.costs"
      :disabled="modeBusy"
      plain
      legend="Mode"
      aria-label="Mode"
      @update:model-value="onPickMode"
    />

    <button type="button" class="min-h-11 px-2 text-xs font-semibold" @click="showActions = true">Actions</button>
    <Dialog v-model:visible="showActions" modal header="Your MARV actions" :style="{ width: '36rem', maxWidth: '94vw' }">
      <AppMarvPersonalActions v-if="showActions" />
    </Dialog>
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

const { me, preferredMode, credits, setPreferredMode } = useMarv()
const showActions = ref(false)
const modeBusy = ref(false)

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
