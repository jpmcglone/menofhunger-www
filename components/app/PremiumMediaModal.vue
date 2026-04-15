<template>
  <AppConfirmDialog
    :visible="open"
    header="Premium required"
    message="Media posts (images, GIFs, and videos) are for premium members. Upgrade to post media."
    cancel-label="Not now"
    confirm-label="Go to settings"
    confirm-severity="primary"
    @update:visible="!$event && hide()"
    @confirm="onGoToSettings"
    @cancel="hide"
  />
</template>

<script setup lang="ts">
const { open, hide } = usePremiumMediaModal()

async function onGoToSettings() {
  hide()
  await navigateTo('/settings')
}
</script>
