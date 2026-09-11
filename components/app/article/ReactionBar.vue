<template>
  <div class="flex flex-wrap items-center gap-1.5">
    <button
      v-for="r in reactions"
      :key="r.reactionId"
      type="button"
      class="reaction-pill inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-medium transition-colors"
      :class="r.viewerHasReacted
        ? 'border-[var(--moh-marv)] bg-[color-mix(in_srgb,var(--moh-marv)_12%,transparent)] text-[var(--moh-text)]'
        : 'border-[var(--moh-border)] moh-surface-2 text-[var(--moh-text)] hover:bg-[var(--moh-surface-hover)]'"
      :aria-pressed="r.viewerHasReacted"
      :aria-label="`${r.emoji} ${r.count} reactions`"
      @click="emit('toggle', r.reactionId, r.emoji)"
    >
      <span>{{ r.emoji }}</span>
      <span class="tabular-nums">{{ r.count }}</span>
    </button>

    <!-- Mount the interactive picker after hydration; both initial renders omit it. -->
    <div v-if="mounted && !readonly" ref="pickerAnchorEl" class="relative">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-full border moh-border moh-surface-2 px-2.5 py-1 text-sm moh-text-muted transition-colors hover:bg-[var(--moh-surface-hover)]"
        aria-label="Add reaction"
        @click="pickerOpen = !pickerOpen"
      >
        <Icon name="tabler:mood-smile-filled" class="text-[14px]" />
        <Icon name="tabler:plus" class="text-[10px]" />
      </button>

      <Teleport to="body">
      <div
        v-if="pickerOpen"
        ref="menuEl"
        class="fixed z-[2000] flex items-center gap-1 rounded-xl border moh-border moh-surface p-2 shadow-lg"
        :style="menuStyle"
        role="menu"
        aria-label="Pick a reaction"
      >
        <button
          v-for="reaction in REACTIONS"
          :key="reaction.id"
          type="button"
          class="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-[var(--moh-surface-hover)]"
          :aria-label="reaction.label"
          :title="reaction.label"
          @click="pick(reaction.id, reaction.emoji)"
        >
          {{ reaction.emoji }}
        </button>
      </div>
      </Teleport>
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
const { style: menuStyle, menuEl, place: placeMenu, reset: resetMenu } = useMenuPosition()

watch(pickerOpen, (isOpen) => {
  if (!isOpen) {
    resetMenu()
    return
  }
  const el = pickerAnchorEl.value
  if (!el) return
  placeMenu(el, {
    menuWidth: 220,
    menuHeight: 52,
    gap: 8,
    trackViewport: true,
  })
})

function pick(reactionId: string, emoji: string) {
  emit('toggle', reactionId, emoji)
  pickerOpen.value = false
}

function onDocPointerDown(e: PointerEvent) {
  if (!pickerOpen.value) return
  const t = e.target as Node
  if (pickerAnchorEl.value?.contains(t) || menuEl.value?.contains(t)) return
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
