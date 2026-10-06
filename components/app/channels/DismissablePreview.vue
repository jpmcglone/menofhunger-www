<template>
  <div v-if="dismissible" class="group/preview relative">
    <slot />
    <button type="button" class="moh-focus absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-full opacity-0 transition-opacity focus-visible:opacity-100 group-hover/preview:opacity-100 group-focus-within/preview:opacity-100 [@media(hover:none)]:opacity-100" aria-label="Remove this preview" @click.stop="emit('dismiss')">
      <span class="flex size-7 items-center justify-center rounded-full border moh-border moh-surface shadow-sm"><Icon name="tabler:x" class="size-4" aria-hidden="true" /></span>
    </button>
  </div>
  <slot v-else />
</template>
<script setup lang="ts">
defineProps<{ dismissible?: boolean }>()
const emit = defineEmits<{ dismiss: [] }>()
</script>
