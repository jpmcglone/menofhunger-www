<template>
  <div
    :class="[
      'flex shrink-0 items-center gap-0.5 transition-opacity duration-150',
      visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
    ]"
  >
    <button
      v-for="action in actions"
      :key="action.key"
      type="button"
      :title="action.title"
      :aria-label="action.label"
      class="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
      @click.stop="action.key === 'menu' ? emit('menu', $event) : emit('react', $event)"
    >
      <Icon :name="action.icon" size="14" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  /** Fades in while the message row is hovered. */
  visible: boolean
  /** Own messages put the menu first (bar sits left of the bubble); incoming puts react first. */
  outgoing?: boolean
}>()
const emit = defineEmits<{ menu: [event: Event]; react: [event: Event] }>()

const MENU = { key: 'menu', title: 'More options', label: 'More options', icon: 'tabler:dots' } as const
const REACT = { key: 'react', title: 'React', label: 'Add reaction', icon: 'tabler:mood-smile' } as const
const actions = computed(() => (props.outgoing ? [MENU, REACT] : [REACT, MENU]))
</script>
