<template>
  <AppPageContent bottom="standard">
    <div class="moh-gutter-x py-16 text-center space-y-3">
      <h2 class="text-lg font-semibold moh-text">{{ feature }} is personal</h2>
      <p class="text-sm moh-text-muted max-w-sm mx-auto">
        Switch to {{ operatorLabel }} to continue. This page is for the public account.
      </p>
      <div class="flex flex-wrap justify-center gap-2 pt-2">
        <Button
          :label="`Switch to ${operatorLabel}`"
          rounded
          :disabled="!canSwitch || Boolean(switchingId)"
          @click="onSwitch"
        />
        <Button
          as="NuxtLink"
          to="/home"
          label="Not now"
          severity="secondary"
          rounded
        />
      </div>
    </div>
  </AppPageContent>
</template>

<script setup lang="ts">
defineProps<{
  feature: string
}>()

const route = useRoute()
const { operatorLabel, operator, switchingId, switchToOperator } = usePersonAccountGate()
const canSwitch = computed(() => Boolean(operator.value?.operatorUserId))

async function onSwitch() {
  await switchToOperator(route.fullPath)
}
</script>
