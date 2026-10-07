<template>
  <div
    v-tooltip.bottom="tinyTooltip(tooltipText)"
    class="moh-badge-tile group flex flex-col items-center text-center select-none"
    :class="earned ? 'moh-badge-tile--earned' : 'moh-badge-tile--locked'"
    role="img"
    :aria-label="ariaLabel"
  >
    <div :class="['moh-badge-medallion', `moh-badge-medallion--${badge.tier}`, earned ? '' : 'moh-badge-medallion--locked']">
      <Icon
        :name="earned ? badge.icon : 'tabler:lock'"
        class="moh-badge-medallion__icon"
        aria-hidden="true"
      />
    </div>
    <div class="mt-2.5 text-sm font-semibold leading-tight" :class="earned ? 'moh-text' : 'moh-text-muted'">
      {{ badge.name }}
    </div>
    <div class="mt-0.5 text-[11px] font-medium leading-tight tracking-wide moh-text-muted">
      {{ requirementText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Badge } from '~/config/milestones'
import { tinyTooltip } from '~/utils/tiny-tooltip'

const props = defineProps<{
  badge: Badge
  longestStreakDays: number
}>()

const earned = computed(() => props.longestStreakDays >= props.badge.minStreakDays)

const requirementText = computed(() => {
  if (earned.value) return `${props.badge.minStreakDays}-day streak`
  const remaining = Math.max(0, props.badge.minStreakDays - props.longestStreakDays)
  return remaining === 1 ? '1 day to go' : `${remaining} days to go`
})

const tooltipText = computed(() => {
  if (earned.value) return props.badge.description
  return `Locked — ${props.badge.description}`
})

const ariaLabel = computed(() =>
  earned.value
    ? `${props.badge.name} badge earned. ${props.badge.description}`
    : `${props.badge.name} badge locked. ${props.badge.description}`,
)
</script>

<style scoped>
.moh-badge-tile {
  transition: transform 150ms ease-out;
}

.moh-badge-tile--earned:hover .moh-badge-medallion {
  transform: translateY(-1px);
}

.moh-badge-medallion {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 4.25rem;
  width: 4.25rem;
  border-radius: 9999px;
  transition: transform 150ms ease-out, box-shadow 200ms ease-out;
}

.moh-badge-medallion__icon {
  font-size: 1.875rem;
  line-height: 1;
  color: rgba(0, 0, 0, 0.78);
  filter: drop-shadow(0 1px 1px rgba(255, 255, 255, 0.35));
}

.moh-badge-medallion--bronze {
  background:
    radial-gradient(circle at 32% 28%, #f6c79b 0%, #cc8b4a 38%, #6a3814 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.25),
    inset 0 -8px 14px rgba(0, 0, 0, 0.32),
    0 6px 18px -8px rgba(204, 139, 74, 0.55),
    0 0 0 4px rgba(204, 139, 74, 0.10);
}

.moh-badge-medallion--silver {
  background:
    radial-gradient(circle at 32% 28%, #f4f4f4 0%, #b9bdc4 40%, #5a6068 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.35),
    inset 0 -8px 14px rgba(0, 0, 0, 0.30),
    0 6px 18px -8px rgba(185, 189, 196, 0.55),
    0 0 0 4px rgba(185, 189, 196, 0.10);
}

.moh-badge-medallion--gold {
  background:
    radial-gradient(circle at 32% 28%, #ffe89b 0%, #f0b945 40%, #8a5a0a 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.35),
    inset 0 -8px 14px rgba(0, 0, 0, 0.30),
    0 6px 22px -8px rgba(240, 185, 69, 0.65),
    0 0 0 4px rgba(240, 185, 69, 0.12);
}

/* Locked tiles look "carved" rather than punitive — same medallion shape,
   muted neutral fill, faded lock glyph. Light theme by default; dark theme
   overrides below. */
.moh-badge-medallion--locked {
  background:
    radial-gradient(circle at 32% 28%, #ebe9e3 0%, #cfccc4 50%, #a8a49b 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.45),
    inset 0 -6px 10px rgba(0, 0, 0, 0.10);
}

.moh-badge-medallion--locked .moh-badge-medallion__icon {
  color: rgba(0, 0, 0, 0.40);
  filter: none;
}

:global(html.dark) .moh-badge-medallion--locked {
  background:
    radial-gradient(circle at 32% 28%, #2a2f37 0%, #1a1d22 50%, #0f1216 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 -6px 10px rgba(0, 0, 0, 0.45);
}

:global(html.dark) .moh-badge-medallion--locked .moh-badge-medallion__icon {
  color: rgba(255, 255, 255, 0.35);
}
</style>
