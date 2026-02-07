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
        v-if="open && preview"
        ref="cardEl"
        class="fixed z-[1100] w-[340px] max-w-[calc(100vw-24px)]"
        :style="posStyle"
        @mouseenter="onCardEnter"
        @mouseleave="onCardLeave"
      >
        <AppUserPreviewCard :user="preview" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'

const pop = useUserPreviewPopover()
const { state } = pop

const open = computed(() => Boolean(state.value.open))
const preview = computed(() => state.value.preview)

const cardEl = ref<HTMLElement | null>(null)
const measured = ref<{ w: number; h: number } | null>(null)

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function measureAndClamp() {
  if (!import.meta.client) return
  const el = cardEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  measured.value = { w: r.width, h: r.height }
}

watch(
  () => [open.value, state.value.x, state.value.y, preview.value?.id],
  async () => {
    if (!import.meta.client) return
    if (!open.value) return
    await nextTick()
    measureAndClamp()
  },
  { flush: 'post' },
)

const posStyle = computed<CSSProperties>(() => {
  const x = state.value.anchorX
  const y = state.value.anchorY

  const margin = 8
  // Smaller offset reduces the “gap” when moving into the card.
  const offset = 8
  const w = measured.value?.w ?? 340
  const h = measured.value?.h ?? 200

  const maxLeft = Math.max(margin, window.innerWidth - w - margin)
  const maxTop = Math.max(margin, window.innerHeight - h - margin)

  const left = clamp(x + offset, margin, maxLeft)
  const top = clamp(y + offset, margin, maxTop)

  return { left: `${Math.floor(left)}px`, top: `${Math.floor(top)}px` }
})

function onCardEnter() {
  pop.onCardEnter()
}
function onCardLeave() {
  pop.onCardLeave()
}

onMounted(() => {
  const onPointerDown = (e: PointerEvent) => {
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

