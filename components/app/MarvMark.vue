<template>
  <!-- M.A.R.V glyph — bare icon, no box. Callers provide the accessible label. -->
  <Icon name="tabler:news" class="moh-text-muted shrink-0" :style="iconStyle" aria-hidden="true" />
</template>

<script setup lang="ts">
/**
 * M.A.R.V logo mark — bare news icon used for the "Catch me up" trigger.
 * Purely presentational; callers provide the accessible label.
 */
const props = withDefaults(defineProps<{ size?: number }>(), { size: 20 })

const iconStyle = computed(() => ({ fontSize: `${props.size}px` }))
</script>
