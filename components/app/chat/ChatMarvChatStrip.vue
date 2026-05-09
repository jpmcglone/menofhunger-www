<template>
  <!--
    A compact strip rendered just below the main chat header when the selected
    conversation is the viewer's DM with Marv. Shows:
      - a "Model" dropdown (Auto / Fast / Regular / Smart) that PATCHes preferences
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
    <!-- Model dropdown -->
    <div ref="dropdownRef" class="relative" @keydown.escape="open = false">
      <!-- Trigger: ghost pill, no border — "MODEL  Auto ▾" -->
      <button
        type="button"
        :disabled="modeBusy"
        class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition-colors hover:bg-black/5 disabled:opacity-50 dark:hover:bg-white/8"
        aria-haspopup="listbox"
        :aria-expanded="open"
        @click="open = !open"
      >
        <span class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Model</span>
        <span
          class="flex h-4 w-4 items-center justify-center rounded-md text-[11px] transition-colors"
          :class="modeIconBg(preferredMode ?? 'auto', true)"
        >
          <Icon :name="modeIcon(preferredMode ?? 'auto')" aria-hidden="true" />
        </span>
        <span class="font-semibold text-gray-800 dark:text-gray-100">{{ modeLabel(preferredMode ?? 'auto') }}</span>
        <Icon
          name="tabler:chevron-down"
          class="text-[10px] text-gray-400 transition-transform duration-150 dark:text-gray-500"
          :class="open ? 'rotate-180' : ''"
          aria-hidden="true"
        />
      </button>

      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0 translate-y-1 scale-[0.97]"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-1 scale-[0.97]"
      >
        <ul
          v-if="open"
          role="listbox"
          aria-label="Model"
          class="absolute left-0 top-full z-50 mt-1.5 min-w-[180px] origin-top-left rounded-2xl bg-white py-1.5 shadow-2xl ring-1 ring-black/[0.06] dark:bg-zinc-900 dark:ring-white/[0.07]"
        >
          <li
            v-for="mode in (['auto', 'fast', 'regular', 'smart'] as const)"
            :key="mode"
            role="option"
            :aria-selected="preferredMode === mode"
            :class="[
              'mx-1.5 flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-xs transition-colors',
              preferredMode === mode
                ? 'bg-violet-50 text-gray-900 dark:bg-violet-500/10 dark:text-white'
                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5',
            ]"
            @click="onPickMode(mode)"
          >
            <!-- Mode icon -->
            <span
              class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[13px] transition-colors"
              :class="modeIconBg(mode, preferredMode === mode)"
            >
              <Icon :name="modeIcon(mode)" aria-hidden="true" />
            </span>
            <span class="font-semibold">{{ modeLabel(mode) }}</span>
            <span class="ml-auto font-normal text-gray-400 dark:text-gray-500">{{ modeSubtitle(mode) }}</span>
          </li>
        </ul>
      </Transition>
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
import { onClickOutside } from '@vueuse/core'
import type { MarvinModeDto } from '~/types/api'

const { preferredMode, credits, setPreferredMode } = useMarv()
const modeBusy = ref(false)
const open = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
onClickOutside(dropdownRef, () => { open.value = false })

function modeLabel(m: MarvinModeDto): string {
  if (m === 'auto') return 'Auto'
  if (m === 'fast') return 'Fast'
  if (m === 'smart') return 'Smart'
  return 'Regular'
}

function modeIcon(m: MarvinModeDto): string {
  if (m === 'auto') return 'tabler:sparkles'
  if (m === 'fast') return 'tabler:bolt'
  if (m === 'smart') return 'tabler:brain'
  return 'tabler:scale'
}

function modeIconBg(m: MarvinModeDto, selected: boolean): string {
  if (selected) {
    if (m === 'auto') return 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400'
    if (m === 'fast') return 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
    if (m === 'smart') return 'bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400'
    return 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
  }
  if (m === 'auto') return 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-gray-500'
  if (m === 'fast') return 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-gray-500'
  if (m === 'smart') return 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-gray-500'
  return 'bg-gray-100 text-gray-400 dark:bg-zinc-800 dark:text-gray-500'
}

function modeSubtitle(m: MarvinModeDto): string {
  if (m === 'auto') return 'recommended'
  if (m === 'fast') return 'quickest'
  if (m === 'smart') return 'deepest'
  return 'balanced'
}

async function onPickMode(mode: MarvinModeDto) {
  open.value = false
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
