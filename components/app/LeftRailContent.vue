<template>
  <div :class="wrapperClass">
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  compact: boolean
}>()

const wrapperClass = computed(() => [
  // Keep internal layout stable; only width changes between compact and wide.
  // This wrapper is "content", not the layout container — it owns its own padding.
  'min-h-full w-14 px-1 py-4 transition-[width,padding] duration-200 ease-out flex flex-col',
  // On desktop, match the right rail's padding (`px-4`) in both modes.
  // When compact, increase rail width so the inner content can still fit `w-12`,
  // while keeping the same right gutter to the divider as wide mode.
  // Prefer: left collapses (xl) before right rail hides (lg).
  props.compact ? 'md:w-20 md:px-4' : 'md:w-20 md:px-4 xl:w-56 xl:px-4',
])
</script>

