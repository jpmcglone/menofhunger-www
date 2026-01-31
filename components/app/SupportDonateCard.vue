<template>
  <Card>
    <template #content>
      <div class="space-y-4">
        <!-- Header: icon + title + subtitle -->
        <div class="flex gap-3">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
            aria-hidden="true"
          >
            <i class="pi pi-heart text-xl" aria-hidden="true" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="font-bold text-gray-900 dark:text-white">Support Men of Hunger</div>
            <div class="text-sm text-gray-500 dark:text-gray-400">Help keep the community going.</div>
          </div>
        </div>

        <!-- Progress: label + bar + percentage -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500 dark:text-gray-400">Monthly goal</span>
            <span class="font-medium text-gray-900 dark:text-white">{{ goalPercent }}%</span>
          </div>
          <ProgressBar :value="goalPercent" :show-value="false" class="!h-2" />
        </div>

        <!-- CTA -->
        <Button
          label="Donate Now"
          icon="pi pi-heart"
          class="w-full justify-center !rounded-xl"
          severity="secondary"
          @click="onDonateClick"
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
const { push: pushToast } = useAppToast()

// Placeholder: static progress for display only (not hooked to anything).
const goalPercent = 0

function onDonateClick() {
  pushToast({
    title: "Not available yet",
    message: "Contact John if you want to donate.",
    tone: "public",
    durationMs: 5000,
  })
}
</script>
