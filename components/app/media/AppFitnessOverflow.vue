<template>
  <div class="relative">
    <button
      type="button"
      class="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
      aria-label="More"
      @click="open = !open"
    >
      <Icon name="tabler:dots" class="text-base" />
    </button>
    <div
      v-if="open"
      class="absolute right-0 top-full z-20 mt-1 min-w-[7rem] rounded-lg border moh-border moh-surface-1 py-1"
    >
      <button
        type="button"
        class="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800"
        @click="onShare"
      >
        Share
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ share: [] }>()
const open = ref(false)

function onShare() {
  open.value = false
  emit('share')
}
</script>
