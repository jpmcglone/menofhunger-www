<template>
  <div v-if="reactions.length > 0 || isAuthed" class="mt-1 sm:hidden">
    <div class="flex items-center gap-2">
      <div class="min-w-0 flex-1 overflow-x-auto no-scrollbar">
        <div class="flex w-max items-center gap-1.5 pr-2">
          <button
            v-for="r in reactions"
            :key="`mobile-pill-${r.reactionId}`"
            type="button"
            class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-medium transition-colors"
            :class="r.viewerHasReacted
              ? 'border-[var(--moh-marv)] bg-[color-mix(in_srgb,var(--moh-marv)_12%,transparent)] text-[var(--moh-text)]'
              : 'border-[var(--moh-border)] moh-surface-2 text-[var(--moh-text)] hover:bg-[var(--moh-surface-hover)]'"
            :aria-pressed="r.viewerHasReacted"
            :aria-label="`${r.emoji} ${r.count} reactions`"
            @click="emit('toggle', r.reactionId, r.emoji)"
          >
            <span>{{ r.emoji }}</span>
            <AppAnimatedCount :value="r.count" />
          </button>
        </div>
      </div>
      <div v-if="isAuthed" class="relative shrink-0">
        <button
          type="button"
          class="inline-flex h-8 w-8 items-center justify-center moh-text-soft transition-colors hover:text-[var(--moh-text)]"
          aria-label="Add reaction"
          v-tooltip.bottom="tooltip"
          @click="emit('react', $event.currentTarget as HTMLElement)"
        >
          <Icon name="tabler:mood-smile" size="15" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { tinyTooltip } from '~/utils/tiny-tooltip'

type ReactionPill = { reactionId: string; emoji: string; count: number; viewerHasReacted: boolean }

defineProps<{ reactions: ReactionPill[]; isAuthed: boolean }>()
const emit = defineEmits<{
  (e: 'toggle', reactionId: string, emoji: string): void
  (e: 'react', anchor: HTMLElement): void
}>()

const tooltip = computed(() => tinyTooltip('React'))
</script>
