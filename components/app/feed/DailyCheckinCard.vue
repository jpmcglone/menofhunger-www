<template>
  <!-- Streak-intact state: user has already checked in today -->
  <div v-if="hasCheckedInToday" class="px-3 pt-2.5 pb-3 sm:px-4 sm:pt-3">
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

  <!-- Prompt state: user hasn't checked in today -->
  <div v-else class="px-3 pt-2.5 pb-1 sm:px-4 sm:pt-3">
    <div
      class="rounded-xl border px-4 py-3"
      style="background-color: var(--moh-checkin-soft); border-color: rgba(var(--moh-checkin-rgb), 0.3)"
    >
      <div class="flex items-start gap-3">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl mt-0.5"
          style="background-color: rgba(var(--moh-checkin-rgb), 0.18)"
        >
          <Icon name="tabler:calendar-check" class="text-lg" aria-hidden="true" style="color: var(--moh-checkin)" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <div class="text-[10px] font-semibold uppercase tracking-wide" style="color: var(--moh-checkin); opacity: 0.75">
              Today's Prompt
            </div>
            <!-- Active streak pill -->
            <div
              v-if="streak > 0"
              class="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none"
              style="background-color: rgba(var(--moh-checkin-rgb), 0.15); color: var(--moh-checkin)"
            >
              <Icon name="tabler:flame" class="text-[9px]" aria-hidden="true" />
              {{ streak }}-day streak
            </div>
            <!-- Coin multiplier -->
            <div
              v-if="nextMultiplier > 1"
              class="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none text-white"
              style="background-color: var(--moh-checkin)"
              :title="`Post today to earn ${nextMultiplier}x coins`"
            >
              {{ nextMultiplier }}x coins
            </div>
          </div>

          <div class="mt-1 text-sm leading-snug moh-text">
            {{ prompt }}
          </div>

          <div class="mt-1.5 text-[11px] moh-text-muted">
            <template v-if="streak > 0">Post today to keep your {{ streak }}-day streak alive.</template>
            <template v-else>Any post today starts your streak. Check in with today's prompt:</template>
          </div>

          <!-- Mobile: place CTA below content, right-aligned -->
          <div class="mt-2 flex justify-end sm:hidden">
            <Button
              label="Check in"
              size="small"
              rounded
              class="!h-8 !min-h-8 !px-3 !py-0 !text-xs !leading-none whitespace-nowrap moh-btn-scope moh-btn-tone"
              @click="$emit('check-in')"
            />
          </div>
        </div>

        <!-- Desktop+: keep CTA on the right -->
        <div class="hidden sm:block">
          <Button
            label="Check in"
            size="small"
            rounded
            class="shrink-0 mt-0.5 !h-8 !min-h-8 !px-3 !py-0 !text-xs !leading-none whitespace-nowrap moh-btn-scope moh-btn-tone"
            @click="$emit('check-in')"
          />
        </div>
      </div>

      <AppInlineAlert v-if="error" class="mt-2" severity="danger">
        {{ error }}
      </AppInlineAlert>
    </div>
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
