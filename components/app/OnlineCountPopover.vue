<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open && rows.length > 0"
        ref="cardEl"
        class="fixed z-[1100] w-[260px] max-w-[calc(100vw-24px)] transition-[left,top] duration-150 ease-out motion-reduce:transition-none will-change-[left,top]"
        :style="posStyle"
        @mouseenter="onCardEnter"
        @mouseleave="onCardLeave"
      >
        <div class="rounded-xl border moh-border moh-bg p-3">
          <div class="space-y-2 text-sm">
            <div v-for="r in rows" :key="r.key" class="flex items-center justify-between gap-4">
              <div :class="labelClass(r.tone)" class="font-semibold">
                {{ r.label }}
              </div>
              <div :class="labelClass(r.tone)" class="font-semibold tabular-nums">
                {{ r.count }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { OnlineCountRow } from '~/composables/useOnlineCountPopover'

const pop = useOnlineCountPopover()
const { state } = pop

const open = computed(() => Boolean(state.value.open))
const rows = computed<OnlineCountRow[]>(() => state.value.rows ?? [])

const cardEl = ref<HTMLElement | null>(null)

const { style: posStyle } = useAnchoredPopoverPosition({
  open,
  anchorX: computed(() => state.value.anchorX),
  anchorY: computed(() => state.value.anchorY),
  el: cardEl,
  defaultWidth: 260,
  defaultHeight: 140,
  preferLeft: true,
  margin: 8,
  offset: 8,
})

function labelClass(tone: OnlineCountRow['tone']) {
  if (tone === 'premium') return 'text-[var(--moh-premium)]'
  if (tone === 'verified') return 'text-[var(--moh-verified)]'
  return 'text-gray-700 dark:text-gray-200'
}

function onCardEnter() {
  pop.onCardEnter()
}
function onCardLeave() {
  pop.onCardLeave()
}

onMounted(() => {
  const onPointerDown = (e: PointerEvent) => {
    pop.cancelPending()
    if (!state.value.open) return
    const el = cardEl.value
    if (!el) return
    if (e.target instanceof Node && el.contains(e.target)) return
    pop.close()
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (!state.value.open) return
    if (e.key === 'Escape') pop.close()
  }

  document.addEventListener('pointerdown', onPointerDown, { capture: true })
  window.addEventListener('keydown', onKeyDown)
  onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onPointerDown, true)
    window.removeEventListener('keydown', onKeyDown)
  })
})
</script>

