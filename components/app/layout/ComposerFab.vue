<template>
  <Transition
    enter-active-class="transition-opacity duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <button
      v-if="visible"
      type="button"
      aria-label="New post"
      :class="[
        'moh-pressable md:hidden fixed right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg hover:opacity-95 moh-focus-strong',
        buttonClass,
      ]"
      :style="bottomStyle"
      @click="emit('open')"
    >
      <Icon name="tabler:plus" class="text-3xl" aria-hidden="true" />
    </button>
  </Transition>
</template>

<script setup lang="ts">
/** Mobile new-post button, floated above the tab bar (and the radio bar when it is up). */
defineProps<{ visible: boolean; buttonClass: string | string[] | Record<string, boolean>; bottomStyle: Record<string, string> }>()
const emit = defineEmits<{ open: [] }>()
</script>
