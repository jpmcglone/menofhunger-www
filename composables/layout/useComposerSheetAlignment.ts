import type { ComputedRef, Ref } from 'vue'

/** Keeps the composer sheet (and bottom cards) aligned with the center column while open. */
export function useComposerSheetAlignment(deps: {
  middleContentEl: Ref<HTMLElement | null>
  middleScrollerEl: Ref<HTMLElement | null>
  composerSheetStyle: Ref<Record<string, string>>
  centerAlignedOpen: ComputedRef<boolean>
}) {
  const { middleContentEl, middleScrollerEl, composerSheetStyle, centerAlignedOpen } = deps

  function updateComposerSheetStyle() {
    if (!import.meta.client) return
    const el = middleContentEl.value ?? middleScrollerEl.value
    if (!el) return
    const r = el.getBoundingClientRect()

    // Match the actual center-column content area so it lines up with posts/cards.
    composerSheetStyle.value = {
      left: `${Math.max(0, Math.floor(r.left))}px`,
      width: `${Math.max(0, Math.floor(r.width))}px`,
    }
  }

  watch(
    centerAlignedOpen,
    (open) => {
      if (!import.meta.client) return
      window.removeEventListener('resize', updateComposerSheetStyle)
      window.visualViewport?.removeEventListener('resize', updateComposerSheetStyle)
      if (open) {
        requestAnimationFrame(() => updateComposerSheetStyle())
        window.addEventListener('resize', updateComposerSheetStyle)
        window.visualViewport?.addEventListener('resize', updateComposerSheetStyle)
      }
    },
    { flush: 'post' },
  )

  onUnmounted(() => {
    if (!import.meta.client) return
    window.removeEventListener('resize', updateComposerSheetStyle)
    window.visualViewport?.removeEventListener('resize', updateComposerSheetStyle)
  })
}
