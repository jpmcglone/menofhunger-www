<template>
  <header class="space-y-2">
    <div v-if="$slots.badges" class="flex flex-wrap items-center gap-2">
      <slot name="badges" />
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-2">
        <slot name="leading" />
        <!-- Reserve space so icons don't "pop in" and shift layout while loading -->
        <span
          v-if="icon"
          class="inline-flex h-5 w-5 shrink-0 items-center justify-center opacity-80"
          aria-hidden="true"
        >
          <Icon :name="icon" class="h-full w-full" aria-hidden="true" />
        </span>
        <h1 class="moh-title min-w-0 truncate text-2xl font-semibold tracking-tight">{{ title }}</h1>
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

