<template>
  <Dialog
    v-model:visible="open"
    modal
    header="Premium required"
    :draggable="false"
    class="w-[min(30rem,calc(100vw-2rem))]"
    aria-label="Premium required for media"
  >
    <p class="text-sm moh-text-muted">
      Media posts (images, GIFs, and videos) are for premium members. Upgrade to post media.
    </p>

    <template #footer>
      <Button label="Not now" severity="secondary" text @click="hide" />
      <Button label="Go to settings" @click="onGoToSettings" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
const { open, hide } = usePremiumMediaModal()

async function onGoToSettings() {
  hide()
  await navigateTo('/settings')
}
</script>

