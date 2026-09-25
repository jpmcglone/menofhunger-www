<template>
  <span
    v-if="tone"
    class="inline-flex items-center rounded-full border px-2 py-px text-[11px] font-semibold leading-4"
    :style="{ color: `var(--moh-${tone})`, borderColor: `var(--moh-${tone})` }"
  >{{ tone === 'premium' ? 'Premium' : 'Verified' }}</span>
</template>

<script setup lang="ts">
const props = defineProps<{ visibility: string | null | undefined }>()
const tone = computed(() => boardScopeTone(props.visibility))
</script>
