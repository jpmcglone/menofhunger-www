<template>
  <Card class="moh-card moh-card-matte !rounded-2xl">
    <template #content>
      <div class="space-y-4">
        <!-- Header: icon + title + subtitle -->
        <div class="flex gap-3">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl moh-surface text-gray-600 dark:text-zinc-300"
            aria-hidden="true"
          >
            <Icon name="tabler:heart" class="text-xl" aria-hidden="true" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="moh-h2">Support Men of Hunger</div>
            <div class="moh-meta">Help keep the community going.</div>
          </div>
        </div>

        <!-- Progress: label + bar + percentage -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm">
            <span class="moh-meta">Monthly goal</span>
            <span class="moh-meta-strong moh-text tabular-nums">{{ goalPercent }}%</span>
          </div>
          <ProgressBar :value="goalPercent" :show-value="false" class="!h-2" />
        </div>

        <!-- CTA -->
        <Button
          label="Donate Now"
          class="w-full justify-center !rounded-xl moh-focus"
          severity="secondary"
          @click="onDonateClick"
        >
          <template #icon>
            <Icon name="tabler:heart" aria-hidden="true" />
          </template>
        </Button>
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
