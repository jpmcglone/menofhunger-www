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
        class="moh-count-breakdown"
        role="dialog"
        :aria-labelledby="titleId"
        :style="posStyle"
        @mouseenter="onCardEnter"
        @mouseleave="onCardLeave"
        @focusin="onCardEnter"
        @focusout="onCardLeave"
      >
        <header class="moh-count-breakdown-header">
          <div>
            <h2 :id="titleId">{{ total.toLocaleString('en-US') }} online</h2>
            <p>Members online now</p>
          </div>
          <button type="button" class="moh-count-breakdown-close moh-tap" aria-label="Close breakdown" @click="pop.close()"><Icon name="tabler:x" aria-hidden="true" /></button>
        </header>
        <div class="moh-count-breakdown-section">
          <div v-for="r in rows" :key="r.key" class="moh-count-breakdown-row">
            <span class="moh-count-breakdown-label"><span class="moh-count-breakdown-dot" :class="dotClass(r.tone)" aria-hidden="true" />{{ r.label }}</span>
            <span class="moh-count-breakdown-value">{{ r.count.toLocaleString('en-US') }}</span>
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

const titleId = `online-breakdown-${useId()}`
const total = computed(() => rows.value.reduce((sum, row) => sum + row.count, 0))
const cardEl = ref<HTMLElement | null>(null)

const { style: posStyle } = useAnchoredPopoverPosition({
  open,
  anchorX: computed(() => state.value.anchorX),
  anchorY: computed(() => state.value.anchorY),
  el: cardEl,
  defaultWidth: 390,
  defaultHeight: 300,
  preferLeft: true,
  margin: 16,
  offset: 12,
})

function dotClass(tone: OnlineCountRow['tone']) {
  if (tone === 'premium') return 'bg-[var(--moh-premium)]'
  if (tone === 'verified') return 'bg-[var(--moh-verified)]'
  return 'bg-gray-400'
}

function onCardEnter() {
  pop.onCardEnter()
}
function onCardLeave() {
  if (cardEl.value?.contains(document.activeElement)) return
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

