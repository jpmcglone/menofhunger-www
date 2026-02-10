<template>
  <!-- Only render when count is strictly greater than 0. Never show badge for zero. -->
  <span
    v-if="hydrated && badgeCount > 0"
    :class="[
      'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center',
      toneClass,
    ]"
  >
    {{ badgeText }}
  </span>
</template>

<script setup lang="ts">
// Run composable so count is fetched on load / socket connect / tab visible (badge is in layout + TabBar).
const { primaryCount: badgeCount, displayPrimary: badgeText, toneClass } = useMessagesBadge()

// Prevent SSR/client hydration mismatch (server can't know badge count reliably).
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})
</script>
