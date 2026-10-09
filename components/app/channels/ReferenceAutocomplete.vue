<template>
  <Teleport to="body">
    <div
v-if="open" :id="listboxId" ref="panel" role="listbox" aria-label="Channels in this group"
      class="fixed z-[var(--moh-z-menu)] max-h-72 w-[min(22rem,92vw)] overflow-y-auto rounded-xl border moh-border bg-[var(--moh-surface-1)] p-1 shadow-xl"
      :style="popoverStyle">
      <p class="px-3 py-2 text-xs moh-text-muted">Channels in this group</p>
      <button
v-for="(channel, index) in items" :id="`${listboxId}-opt-${index}`" :key="channel.id"
        type="button" role="option" :aria-selected="index === highlightedIndex"
        class="moh-focus flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm"
        :class="index === highlightedIndex ? 'bg-[var(--moh-surface-2)]' : ''"
        @mousedown.prevent @mouseenter="emit('highlight', index)" @click="emit('select', channel)">
        <Icon :name="channel.privacy === 'private' ? 'tabler:lock' : 'tabler:hash'" class="size-4 shrink-0 moh-text-muted" aria-hidden="true" />
        <span class="truncate font-semibold">{{ channelTitle(channel) }}</span>
      </button>
      <p v-if="!items.length" role="status" class="px-3 py-3 text-sm moh-text-muted">No matching channels.</p>
    </div>
  </Teleport>
</template>
<script setup lang="ts">
import { onClickOutside, useEventListener, useWindowSize } from '@vueuse/core'
import type { GroupChannel } from '~/types/api'
import { channelTitle } from '~/utils/channels/reducer'
const props = defineProps<{ open: boolean; items: GroupChannel[]; highlightedIndex: number; listboxId: string; anchor: { left: number; top: number; height: number } | null }>()
const emit = defineEmits<{ select: [channel: GroupChannel]; highlight: [index: number]; 'request-close': [] }>()
const panel = ref<HTMLElement | null>(null)
const { style, measure, measured } = useAnchoredPopoverPosition({ open: toRef(props, 'open'), anchorX: computed(() => props.anchor?.left ?? 0), anchorY: computed(() => (props.anchor?.top ?? 0) + (props.anchor?.height ?? 0)), el: panel, defaultWidth: 352, defaultHeight: 200 })
const { height: viewportHeight } = useWindowSize()
const popoverStyle = computed(() => {
  const anchor = props.anchor
  const height = measured.value?.h ?? 200
  if (anchor && anchor.top + anchor.height + height + 8 > viewportHeight.value) {
    return { ...style.value, top: `${Math.max(8, anchor.top - height - 8)}px` }
  }
  return style.value
})
watch(() => [props.items.length, props.highlightedIndex, props.open], async () => {
  await nextTick()
  if (!props.open) return
  measure()
  panel.value?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
})
onClickOutside(panel, () => { if (props.open) emit('request-close') })
useEventListener('resize', measure)
</script>
