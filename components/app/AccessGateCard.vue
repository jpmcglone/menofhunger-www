<template>
  <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
    <div class="font-semibold text-gray-900 dark:text-gray-50">
      {{ title }}
    </div>
    <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">
      {{ body }}
    </div>
    <div class="mt-3">
      <Button :label="ctaLabel" severity="secondary" @click="navigateTo(ctaTo)" />
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
  if (props.kind === 'verify') return 'Verify your account to view verified-only posts.'
  return 'Upgrade to premium to view premium-only posts.'
})
</script>

