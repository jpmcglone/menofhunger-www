<template>
  <header
    :class="[
      sticky ? 'sticky top-0 z-40 moh-frosted border-b moh-border space-y-0.5' : 'space-y-1.5',
    ]"
  >
    <div v-if="$slots.badges" class="flex flex-wrap items-center gap-2">
      <slot name="badges" />
    </div>

    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-1">
        <slot name="leading" />
        <h1
          :class="[
            'moh-title min-w-0 truncate font-semibold tracking-tight',
            sticky ? 'text-xl' : 'text-2xl',
          ]"
        >{{ title }}</h1>
      </div>

      <div class="flex items-center gap-1 shrink-0">
        <slot name="actions" />
        <slot name="trailing" />
      </div>
    </div>

    <p
      v-if="$slots.description || description"
      :class="[
        'text-gray-500 dark:text-gray-400',
        sticky ? 'text-xs' : 'text-sm',
      ]"
    >
      <slot name="description">{{ description }}</slot>
    </p>
  </header>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  icon?: string
  description?: string
  sticky?: boolean
}>()
</script>

