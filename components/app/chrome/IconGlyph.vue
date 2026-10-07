<template>
  <AppMarvMark v-if="name === 'marv'" :size="size" :thick="selected" />
  <svg v-else viewBox="0 0 24 24" fill="none" class="shrink-0" :width="size" :height="size" aria-hidden="true">
    <use :href="`/icons/moh.svg#${name}-${selected ? 'selected' : 'default'}`" />
  </svg>
</template>

<script setup lang="ts">
import type catalog from '~/design/icon-catalog.json'
withDefaults(defineProps<{ name: keyof typeof catalog; selected?: boolean; size?: number }>(), { selected: false, size: 20 })
</script>
