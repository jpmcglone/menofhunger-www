<template>
  <AppActivityBadge class="absolute -top-0.5 -right-0.5" :count="count" :has-unread="hasUnreadNotifications" count-label="unseen notifications" />
</template>
<script setup lang="ts">
const { count, hasUnreadNotifications } = useNotificationsBadge()
</script>
