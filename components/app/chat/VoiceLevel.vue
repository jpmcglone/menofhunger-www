<template>
  <span class="inline-flex h-6 items-end gap-[3px]" role="img" :aria-label="heard ? 'Hearing your voice' : 'No sound yet'">
    <span
      v-for="(bar, index) in bars"
      :key="index"
      class="w-[3px] rounded-full bg-current transition-[height,opacity] duration-100 ease-out motion-reduce:transition-none"
      :class="heard ? 'text-emerald-500' : 'moh-text-soft'"
      :style="{ height: `${bar}px`, opacity: heard ? 1 : 0.5 }"
    />
  </span>
</template>
<script setup lang="ts">
// RMS of a speaking voice is roughly 0.02 to 0.3; scale so ordinary speech moves the meter visibly.
const props = defineProps<{ level: number }>()
const WEIGHTS = [0.55, 0.8, 1, 0.8, 0.55]
const scaled = computed(() => Math.min(1, Math.sqrt(Math.max(0, props.level)) * 2.2))
const heard = computed(() => props.level > 0.012)
const bars = computed(() => WEIGHTS.map(weight => Math.round(4 + scaled.value * weight * 20)))
</script>
