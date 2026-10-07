<template>
  <AppActivityBadge class="absolute -top-0.5 -right-0.5" :count="badgeCount" :has-unread="channelDot" unread-label="Unread channels" />
</template>

<script setup lang="ts">
// Run composable so count is fetched on load / socket connect / tab visible.
const { total: badgeCount, channelDot } = useGroupsBadge()
</script>
