<template>
  <span
    :class="[
      'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-center',
      resolvedToneClass,
      !(hydrated && badgeCount > 0) ? 'invisible pointer-events-none' : '',
    ]"
  >
    {{ hydrated && badgeCount > 0 ? badgeText : '' }}
  </span>
</template>

<script setup lang="ts">
// Run composable so count is fetched on load / socket connect / tab visible (badge is in layout + TabBar).
// Show total (primary + requests) so recipients with pending message requests also see the badge.
const { totalCount: badgeCount, displayTotal: badgeText, toneClass } = useMessagesBadge()

// Prevent SSR/client hydration mismatch: same markup on server and first client paint.
const hydrated = ref(false)
const resolvedToneClass = computed(() => (hydrated.value ? toneClass.value : 'moh-notif-badge-normal'))
onMounted(() => {
  hydrated.value = true
})
</script>
