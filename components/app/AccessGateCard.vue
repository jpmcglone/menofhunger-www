<template>
  <div
    class="rounded-xl border px-4 py-3.5 flex items-start gap-3.5"
    :class="kind === 'verify'
      ? 'border-blue-200 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/6'
      : 'border-orange-200 bg-orange-50/60 dark:border-orange-500/20 dark:bg-orange-500/6'"
  >
    <!-- Icon badge -->
    <div
      class="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl mt-0.5"
      :class="kind === 'verify'
        ? 'bg-blue-100 dark:bg-blue-500/15'
        : 'bg-orange-100 dark:bg-orange-500/15'"
    >
      <Icon
        :name="kind === 'verify' ? 'tabler:rosette-discount-check' : 'tabler:crown'"
        class="text-lg"
        :class="kind === 'verify' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500 dark:text-orange-400'"
        aria-hidden="true"
      />
    </div>

    <!-- Text + CTA -->
    <div class="flex-1 min-w-0">
      <div class="text-sm font-semibold moh-text leading-snug">{{ title }}</div>
      <div class="mt-0.5 text-[12px] moh-text-muted leading-snug">{{ body }}</div>
      <div class="mt-2.5">
        <Button
          as="NuxtLink"
          :to="ctaTo"
          :label="ctaLabel"
          size="small"
          severity="secondary"
          rounded
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  kind: 'verify' | 'premium'
  ctaLabel?: string
  ctaTo?: string
}>()

const ctaLabel = computed(() => props.ctaLabel ?? 'Go to settings')
const ctaTo = computed(() => props.ctaTo ?? '/settings')

const title = computed(() => {
  if (props.kind === 'verify') return 'Verified members only'
  return 'Premium required'
})

const body = computed(() => {
  if (props.kind === 'verify') return 'Verify your account to view this content.'
  return 'Upgrade to premium to view this content.'
})
</script>
