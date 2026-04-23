<template>
  <span
    :class="[
      'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center tabular-nums',
      toneClass,
      !(badgeCount > 0) ? 'invisible pointer-events-none' : '',
    ]"
  >
    <AppAnimatedCount v-if="badgeCount > 0" :value="badgeCount" :format="() => badgeText" />
  </span>
</template>

<script setup lang="ts">
// Run composable so count is fetched on load / socket connect / tab visible.
const { count: badgeCount, displayCount: badgeText, toneClass } = useCrewInvitesBadge()
</script>
