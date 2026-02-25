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
        class="fixed z-[1300] w-[340px] max-w-[calc(100vw-24px)] rounded-2xl transition-[left,top] duration-150 ease-out motion-reduce:transition-none will-change-[left,top]"
        :style="[posStyle, glowStyle]"
        @mouseenter="onCardEnter"
        @mouseleave="onCardLeave"
      >
        <AppUserPreviewCard :user="preview" />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { userColorTier, userTierColorVar } from '~/utils/user-tier'

const pop = useUserPreviewPopover()
const { state } = pop

const open = computed(() => Boolean(state.value.open))
const preview = computed(() => state.value.preview)

const glowStyle = computed(() => {
  if (!preview.value?.premiumPlus) return {}
  const color = userTierColorVar(userColorTier(preview.value))
  if (!color) return {}
  return {
    boxShadow: `0 0 40px 16px color-mix(in srgb, ${color} 10%, transparent)`,
  }
})

const cardEl = ref<HTMLElement | null>(null)

const { style: posStyle } = useAnchoredPopoverPosition({
  open,
  anchorX: computed(() => state.value.anchorX),
  anchorY: computed(() => state.value.anchorY),
  el: cardEl,
  defaultWidth: 340,
  defaultHeight: 200,
  margin: 8,
  offset: 8,
})

function onCardEnter() {
  pop.onCardEnter()
}
function onCardLeave() {
  pop.onCardLeave()
}

onMounted(() => {
  const onPointerDown = (e: PointerEvent) => {
    // If a delayed preview is pending, cancel it so it can't show after a click+navigate.
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

