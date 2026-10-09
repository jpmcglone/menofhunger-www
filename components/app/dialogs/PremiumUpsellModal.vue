<template>
  <AppConfirmDialog
    :visible="kind !== null"
    header="Premium required"
    :message="kind ? MESSAGES[kind] : ''"
    cancel-label="Not now"
    confirm-label="See plans"
    confirm-severity="primary"
    @update:visible="!$event && hide()"
    @confirm="onGoToTiers"
    @cancel="hide"
  />
</template>

<script setup lang="ts">
import type { PremiumUpsellKind } from '~/composables/usePremiumUpsell'

const MESSAGES: Record<PremiumUpsellKind, string> = {
  media: 'Video posts are for premium members. Upgrade to post video.',
  schedule: 'Scheduling posts is a premium feature. Upgrade to schedule posts in advance.',
}

const { kind, hide } = usePremiumUpsell()

async function onGoToTiers() {
  hide()
  await navigateTo('/tiers')
}
</script>
