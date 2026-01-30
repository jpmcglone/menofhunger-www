<template>
  <header class="space-y-2">
    <div v-if="$slots.badges" class="flex flex-wrap items-center gap-2">
      <slot name="badges" />
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <i v-if="icon" :class="['pi', icon]" aria-hidden="true" />
        <h1 class="moh-title text-2xl font-semibold tracking-tight">{{ title }}</h1>
      </div>

      <slot name="actions" />
    </div>

    <p v-if="$slots.description" class="text-sm text-gray-600 dark:text-gray-300">
      <slot name="description" />
    </p>
    <p v-else-if="description" class="text-sm text-gray-600 dark:text-gray-300">
      {{ description }}
    </p>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  icon?: string
  description?: string
}>()
</script>

