<template>
  <!-- Streak-intact state: user has already checked in today -->
  <div v-if="hasCheckedInToday" class="px-3 pb-3 pt-2 sm:px-4">
    <NuxtLink
      to="/leaderboard"
      class="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 hover:opacity-90 transition-opacity"
      style="background-color: rgba(127, 127, 127, 0.08); border-color: rgba(127, 127, 127, 0.2)"
    >
      <div
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style="background-color: rgba(127, 127, 127, 0.18)"
      >
        <Icon name="tabler:flame" class="text-sm moh-text-muted" aria-hidden="true" />
      </div>
      <div class="flex-1 min-w-0">
        <span class="text-sm font-semibold moh-text">Streak intact</span>
        <span v-if="streak > 0" class="ml-1.5 text-sm moh-text-muted">· Day {{ streak }}</span>
      </div>
      <Icon name="tabler:chevron-right" class="text-xs moh-text-muted shrink-0" aria-hidden="true" />
    </NuxtLink>
  </div>

  <!-- Prompt state: user hasn't checked in today — layout matches WeeklyMissionCard -->
  <div v-else class="px-3 pb-3 pt-2 sm:px-4">
    <button
      type="button"
      class="block w-full rounded-xl border text-left transition-opacity hover:opacity-90 active:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moh-checkin)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--moh-bg)] dark:focus-visible:ring-offset-zinc-950"
      style="background-color: var(--moh-checkin-soft); border-color: rgba(var(--moh-checkin-rgb), 0.3)"
      :title="nextMultiplier > 1 ? `Post today to earn ${nextMultiplier}x coins` : undefined"
      @click="$emit('check-in')"
    >
      <div class="flex items-center gap-3 px-4 py-3.5">
        <div
          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style="background-color: rgba(var(--moh-checkin-rgb), 0.18)"
        >
          <Icon name="tabler:calendar-check" class="text-lg" aria-hidden="true" style="color: var(--moh-checkin)" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold moh-text leading-snug">{{ prompt }}</div>
          <div class="text-[11px] moh-text-muted mt-0.5 leading-snug">
            <template v-if="streak > 0">Post today to keep your {{ streak }}-day streak alive.</template>
            <template v-else>Any post today starts your streak.</template>
            <template v-if="nextMultiplier > 1">
              <span class="mx-1 opacity-40" aria-hidden="true">·</span>
              {{ nextMultiplier }}x coins
            </template>
          </div>
        </div>

        <Icon name="tabler:chevron-right" class="shrink-0 text-sm moh-text-muted" aria-hidden="true" />
      </div>
    </button>

    <AppInlineAlert v-if="error" class="mt-2" severity="danger">
      {{ error }}
    </AppInlineAlert>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  prompt: string
  streak: number
  coins: number
  hasCheckedInToday?: boolean
  error?: string | null
}>()

defineEmits<{
  (e: 'check-in'): void
}>()

const nextMultiplier = computed((): 1 | 2 | 3 | 4 => {
  const next = props.streak + 1
  if (next >= 22) return 4
  if (next >= 15) return 3
  if (next >= 8) return 2
  return 1
})
</script>
