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
        v-if="open && shell"
        ref="cardEl"
        class="fixed z-[1300] w-[340px] max-w-[calc(100vw-24px)] rounded-2xl transition-[left,top] duration-150 ease-out motion-reduce:transition-none will-change-[left,top] overflow-hidden"
        :style="posStyle"
        @mouseenter="onCardEnter"
        @mouseleave="onCardLeave"
      >
        <AppGroupPreviewCard
          v-if="preview"
          :preview="preview"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import AppGroupPreviewCard from '~/components/app/groups/AppGroupPreviewCard.vue'
import type { CommunityGroupShell } from '~/types/api'
import { shellToGroupPreview } from '~/utils/community-group-preview'

const pop = useGroupPreviewPopover()
const { state } = pop

const open = computed(() => Boolean(state.value.open))
const shell = computed(() => state.value.shell)

const preview = computed(() => {
  const s = shell.value
  return s ? shellToGroupPreview(s) : null
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
