<template>
  <div v-if="topMilestone" class="inline-flex items-center gap-1.5 flex-wrap">
    <span
      v-for="m in earnedMilestones"
      :key="m.days"
      class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
      :class="m === topMilestone ? 'text-white' : 'text-[color:var(--moh-checkin)] bg-[color:var(--moh-checkin-soft)] border border-[color:rgba(var(--moh-checkin-rgb),0.3)]'"
      :style="m === topMilestone ? `background-color: var(--moh-checkin)` : ''"
    >
      <Icon name="tabler:flame" class="text-[10px]" aria-hidden="true" />
      {{ m.label }}
    </span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  longestStreakDays: number
}>()

const MILESTONES = [
  { days: 100, label: '100-Day Streak' },
  { days: 30, label: '30-Day Streak' },
  { days: 7, label: '7-Day Streak' },
] as const

const earnedMilestones = computed(() =>
  MILESTONES.filter((m) => props.longestStreakDays >= m.days)
)

const topMilestone = computed(() => earnedMilestones.value[0] ?? null)
</script>
