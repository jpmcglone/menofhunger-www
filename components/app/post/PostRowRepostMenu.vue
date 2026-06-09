<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[9998]"
      @click.stop="open = false"
    />
    <div
      v-if="open"
      ref="menuEl"
      class="fixed z-[9999] min-w-[160px] rounded-xl border moh-border moh-surface shadow-lg overflow-hidden"
      :style="style"
      @click.stop
    >
      <button
        type="button"
        class="flex w-full items-center gap-2 px-4 py-2.5 text-sm moh-text hover:moh-surface-hover transition-colors cursor-pointer"
        @click.stop="onRepost"
      >
        <Icon name="tabler:repeat" class="text-base shrink-0" aria-hidden="true" />
        {{ isReposted ? 'Un-repost' : 'Repost' }}
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-2 px-4 py-2.5 text-sm moh-text hover:moh-surface-hover transition-colors border-t moh-border cursor-pointer"
        @click.stop="onQuote"
      >
        <Icon name="tabler:quote" class="text-base shrink-0" aria-hidden="true" />
        Quote
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  isReposted: boolean
}>()

const emit = defineEmits<{
  repost: []
  quote: []
}>()

const open = ref(false)
const { style, menuEl, place } = useMenuPosition()

/** Toggle the menu, positioning it near the given anchor (the repost button). */
function toggleAt(anchorEl: HTMLElement) {
  place(anchorEl, { menuWidth: 180, menuHeight: 96 })
  open.value = !open.value
}

function onRepost() {
  open.value = false
  emit('repost')
}

function onQuote() {
  open.value = false
  emit('quote')
}

defineExpose({ toggleAt })
</script>
