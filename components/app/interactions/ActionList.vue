<template>
  <div class="moh-divide">
    <div v-for="[section, entries] in sections" :key="section" class="py-1">
      <button v-for="action in entries" :key="action.id" type="button" class="moh-focus flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm moh-surface-hover" :class="action.destructive ? 'text-red-600 dark:text-red-400' : ''" @click="select(action)"><Icon :name="action.icon" aria-hidden="true" /><span>{{ action.label }}</span></button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { actionSections, type SurfaceAction } from '~/utils/surface-actions'
const props = defineProps<{ actions: SurfaceAction[] }>()
const emit = defineEmits<{ select: [] }>()
const sections = computed(() => actionSections(props.actions))
function select(action: SurfaceAction) { emit('select'); void action.run() }
</script>
