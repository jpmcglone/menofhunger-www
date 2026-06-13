<template>
  <AppConfirmDialog
    :visible="open"
    header="Premium required"
    message="Video posts are for premium members. Upgrade to post video."
    cancel-label="Not now"
    confirm-label="See plans"
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
  await navigateTo('/tiers')
}
</script>
