<template>
  <Popover ref="popoverRef" :pt="{ root: { class: 'shadow-xl border moh-border moh-popover rounded-2xl p-2' } }">
    <div class="flex gap-1">
      <button
        v-for="reaction in reactions"
        :key="reaction.id"
        type="button"
        :title="reaction.label"
        :aria-label="reaction.label"
        :class="[
          'flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-all',
          activeReactionIds.has(reaction.id)
            ? 'bg-[var(--p-primary-color)] bg-opacity-20 scale-110 ring-1 ring-[var(--p-primary-color)] ring-opacity-40'
            : 'hover:bg-gray-100 dark:hover:bg-zinc-700 hover:scale-110 active:scale-95',
        ]"
        @click="onSelect(reaction.id)"
      >
        {{ reaction.emoji }}
      </button>
    </div>
  </Popover>
</template>

<script setup lang="ts">
import type { MessageReaction } from '~/types/api'

const props = defineProps<{
  reactions: MessageReaction[]
  activeReactionIds: Set<string>
}>()

const emit = defineEmits<{
  select: [reactionId: string]
}>()

const popoverRef = ref<any>(null)

function toggle(event: Event) {
  popoverRef.value?.toggle(event)
}

function hide() {
  popoverRef.value?.hide()
}

function onSelect(reactionId: string) {
  emit('select', reactionId)
  hide()
}

defineExpose({ toggle, hide })
</script>
