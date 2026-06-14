<template>
  <AppConfirmDialog
    :visible="open"
    header="Premium required"
    message="Scheduling posts is a premium feature. Upgrade to schedule posts in advance."
    cancel-label="Not now"
    confirm-label="See plans"
    confirm-severity="primary"
    @update:visible="!$event && hide()"
    @confirm="onGoToTiers"
    @cancel="hide"
  />
</template>

<script setup lang="ts">
const { open, hide } = useSchedulePremiumModal()

async function onGoToTiers() {
  hide()
  await navigateTo('/tiers')
}
</script>
