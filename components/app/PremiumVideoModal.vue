<template>
  <Dialog
    v-model:visible="open"
    modal
    header="Premium required"
    :draggable="false"
    class="w-[min(30rem,calc(100vw-2rem))]"
    aria-label="Premium required for video uploads"
  >
    <p class="text-sm moh-text-muted">
      Video uploads are for premium members. Upgrade to post videos.
    </p>

    <template #footer>
      <Button label="Not now" severity="secondary" text @click="hide" />
      <Button label="Go to settings" @click="onGoToSettings" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
const { open, hide } = usePremiumVideoModal()

async function onGoToSettings() {
  hide()
  await navigateTo('/settings')
}
</script>
