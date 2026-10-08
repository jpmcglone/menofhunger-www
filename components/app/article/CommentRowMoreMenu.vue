<template>
  <div ref="wrapRef">
    <button
      type="button"
      class="inline-flex h-8 w-8 items-center justify-center moh-text-soft transition-colors hover:text-[var(--moh-text)]"
      aria-label="More options"
      v-tooltip.bottom="tooltip"
      @click="onMoreClick"
    >
      <Icon name="tabler:dots" size="15" />
    </button>
    <Teleport to="body">
      <Transition name="popover">
        <div
          v-if="open"
          ref="menuEl"
          class="fixed z-[var(--moh-z-menu)] w-36 overflow-hidden rounded-xl border moh-border moh-surface shadow-lg"
          :style="menuStyle"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
            @click="onDeleteClick"
          >
            <Icon name="tabler:trash" size="15" class="shrink-0" />
            Delete
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { tinyTooltip } from '~/utils/tiny-tooltip'

const emit = defineEmits<{
  (e: 'delete'): void
  /** Fired when an outside click closes the open menu. */
  (e: 'dismiss'): void
}>()

const tooltip = computed(() => tinyTooltip('More'))
const open = ref(false)
const wrapRef = ref<HTMLElement | null>(null)
const { style: menuStyle, menuEl, place, reset } = useMenuPosition()

function close() {
  open.value = false
  reset()
}

function onMoreClick(e: MouseEvent) {
  const next = !open.value
  if (next) place(e.currentTarget as HTMLElement, { align: 'end', menuWidth: 144, menuHeight: 44 })
  else reset()
  open.value = next
}

function onDeleteClick() {
  open.value = false
  emit('delete')
}

function onDocPointerDown(e: PointerEvent) {
  const target = e.target as Node
  if (open.value && !wrapRef.value?.contains(target) && !menuEl.value?.contains(target)) {
    close()
    emit('dismiss')
  }
}

onMounted(() => window.addEventListener('pointerdown', onDocPointerDown, { capture: true }))
onBeforeUnmount(() => window.removeEventListener('pointerdown', onDocPointerDown, { capture: true } as EventListenerOptions))

defineExpose({ close: () => { open.value = false } })
</script>

<style scoped>
.popover-enter-active,
.popover-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.popover-enter-from,
.popover-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
</style>
