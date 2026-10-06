<template>
  <AppActivityBadge class="absolute -top-0.5 -right-0.5" :count="badgeCount" count-label="unread messages" />
</template>

<script setup lang="ts">
// Run composable so count is fetched on load / socket connect / tab visible (badge is in layout + TabBar).
// Show total (primary + requests) so recipients with pending message requests also see the badge.
const { totalCount: badgeCount } = useMessagesBadge()
</script>
