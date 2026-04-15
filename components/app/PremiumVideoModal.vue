<template>
  <AppConfirmDialog
    :visible="open"
    header="Premium required"
    message="Video uploads are for premium members. Upgrade to post videos."
    cancel-label="Not now"
    confirm-label="Go to settings"
    confirm-severity="primary"
    @update:visible="!$event && hide()"
    @confirm="onGoToSettings"
    @cancel="hide"
  />
</template>

<script setup lang="ts">
const { open, hide } = usePremiumVideoModal()

async function onGoToSettings() {
  hide()
  await navigateTo('/settings')
}
</script>
