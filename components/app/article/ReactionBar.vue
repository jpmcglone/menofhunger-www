<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <button
      v-for="r in reactions"
      :key="r.reactionId"
      type="button"
      class="reaction-pill inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-medium transition-colors"
      :class="r.viewerHasReacted
        ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
        : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-700'"
      :aria-pressed="r.viewerHasReacted"
      :aria-label="`${r.emoji} ${r.count} reactions`"
      @click="emit('toggle', r.reactionId, r.emoji)"
    >
      <span>{{ r.emoji }}</span>
      <span class="tabular-nums">{{ r.count }}</span>
    </button>

    <!-- Add reaction button: always in DOM to avoid hydration mismatch -->
    <div v-show="mounted && !readonly" ref="pickerAnchorEl" class="relative">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-700"
        aria-label="Add reaction"
        @click="pickerOpen = !pickerOpen"
      >
        <Icon name="tabler:mood-smile-filled" class="text-[14px]" />
        <Icon name="tabler:plus" class="text-[10px]" />
      </button>

      <!-- Emoji picker dropdown -->
      <div
        v-if="pickerOpen"
        class="absolute bottom-full left-0 z-30 mb-2 flex items-center gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        role="menu"
        aria-label="Pick a reaction"
      >
        <button
          v-for="reaction in REACTIONS"
          :key="reaction.id"
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800"
          :aria-label="reaction.label"
          :title="reaction.label"
          @click="pick(reaction.id, reaction.emoji)"
        >
          {{ reaction.emoji }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ArticleReactionSummary } from '~/types/api'
import { ARTICLE_REACTIONS as REACTIONS } from '~/utils/article-reactions'

defineProps<{
  reactions: ArticleReactionSummary[]
  readonly?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle', reactionId: string, emoji: string): void
}>()

const pickerOpen = ref(false)
const pickerAnchorEl = ref<HTMLElement | null>(null)
const mounted = ref(false)

function pick(reactionId: string, emoji: string) {
  emit('toggle', reactionId, emoji)
  pickerOpen.value = false
}

function onDocPointerDown(e: PointerEvent) {
  if (!pickerOpen.value) return
  const el = pickerAnchorEl.value
  if (el?.contains(e.target as Node)) return
  pickerOpen.value = false
}

onMounted(() => {
  mounted.value = true
  window.addEventListener('pointerdown', onDocPointerDown, { capture: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', onDocPointerDown, { capture: true } as any)
})
</script>

<style scoped>
.reaction-pill {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
</style>
