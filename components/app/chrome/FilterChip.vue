<!-- Active filter: shown only while the filter is on; clicking clears it. Mirrors iOS activeChip. -->
<template>
  <button
    type="button"
    class="moh-tap moh-focus inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border px-3 text-xs font-semibold transition-opacity hover:opacity-80"
    :style="{
      color: `var(${tone})`,
      borderColor: `var(${tone})`,
      backgroundColor: `color-mix(in srgb, var(${tone}) 10%, transparent)`,
    }"
    :aria-label="`Remove filter ${label}`"
    @click="emit('clear')"
  >
    <span class="truncate">{{ label }}</span>
    <Icon name="tabler:x" class="shrink-0 text-[11px]" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ label: string; tone?: string }>(), { tone: '--moh-verified' })
const emit = defineEmits<{ clear: [] }>()
</script>
