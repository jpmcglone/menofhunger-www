<template>
  <AppAnnouncementModal
    v-model="open"
    :announcement="current"
    @dismiss="onDismiss"
    @cta="onCta"
  />
</template>

<script setup lang="ts">
const {
  current,
  open,
  blockedByGate,
  fetchPending,
  onDismiss,
  onCta,
  onAbandoned,
} = useAnnouncements()

function onVisibility() {
  if (document.visibilityState === 'hidden') void onAbandoned()
}

onMounted(() => {
  if (!blockedByGate.value) void fetchPending()
  document.addEventListener('visibilitychange', onVisibility)
})

watch(blockedByGate, (blocked) => {
  if (!blocked) void fetchPending()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>
