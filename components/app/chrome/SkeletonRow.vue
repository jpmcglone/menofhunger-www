<template>
  <div class="moh-skeleton-row" :class="`moh-skeleton-row--${variant}`" aria-hidden="true">
    <template v-if="variant === 'settings'">
      <span class="moh-skeleton moh-skeleton-row__bar w-[60%]" />
      <span class="moh-skeleton moh-skeleton-row__chevron" />
    </template>
    <template v-else>
      <span class="moh-skeleton moh-skeleton-row__avatar" />
      <span class="moh-skeleton-row__lines">
        <span class="moh-skeleton moh-skeleton-row__bar w-[60%]" />
        <span class="moh-skeleton moh-skeleton-row__bar w-[90%]" />
        <span v-if="variant === 'post'" class="moh-skeleton moh-skeleton-row__bar w-[90%]" />
      </span>
    </template>
  </div>
</template>

<script lang="ts">
export type SkeletonRowVariant = 'post' | 'user' | 'notification' | 'settings'
</script>

<script setup lang="ts">
// Figma brief 1 (list kit): skeleton rows match real row height and padding so content never shifts.

withDefaults(defineProps<{ variant?: SkeletonRowVariant }>(), { variant: 'post' })
</script>

<style scoped>
.moh-skeleton-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 16px; }
.moh-skeleton-row--post { min-height: 96px; }
.moh-skeleton-row--user { align-items: center; min-height: 64px; }
.moh-skeleton-row--notification { min-height: 72px; }
.moh-skeleton-row--settings { align-items: center; justify-content: space-between; min-height: 52px; }
.moh-skeleton-row__avatar { flex: none; width: 40px; height: 40px; border-radius: 999px; }
.moh-skeleton-row--notification .moh-skeleton-row__avatar { width: 36px; height: 36px; }
.moh-skeleton-row__lines { display: flex; flex: 1; flex-direction: column; gap: 8px; padding-top: 4px; min-width: 0; }
.moh-skeleton-row__bar { display: block; height: 12px; border-radius: 6px; }
.moh-skeleton-row__chevron { width: 12px; height: 12px; border-radius: 4px; }
</style>
