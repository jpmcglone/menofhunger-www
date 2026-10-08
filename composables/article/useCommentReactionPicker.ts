import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Floating reaction picker anchored to either the desktop or mobile "add reaction" button. */
export function useCommentReactionPicker(onPick: (reactionId: string, emoji: string) => void) {
  const open = ref(false)
  const buttonDesktopRef = ref<HTMLElement | null>(null)
  const buttonMobileRef = ref<HTMLElement | null>(null)
  const pickerEl = ref<HTMLElement | null>(null)
  const pickerStyle = ref<Record<string, string>>({})
  const anchorEl = ref<HTMLElement | null>(null)

  function updatePosition() {
    if (!import.meta.client) return
    const anchor = anchorEl.value
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const pickerWidth = 240
    const margin = 8
    let left = rect.left
    if (left + pickerWidth > window.innerWidth - margin) left = window.innerWidth - pickerWidth - margin
    if (left < margin) left = margin
    const top = rect.bottom + 6
    pickerStyle.value = { top: `${Math.max(margin, top)}px`, left: `${left}px` }
  }

  function toggle(anchor: HTMLElement | null) {
    if (!anchor) return
    if (open.value && anchorEl.value === anchor) {
      open.value = false
      return
    }
    anchorEl.value = anchor
    updatePosition()
    open.value = true
  }

  function pick(reactionId: string, emoji: string) {
    onPick(reactionId, emoji)
    open.value = false
  }

  function onPointerDown(e: PointerEvent) {
    const target = e.target as Node
    if (open.value && !anchorEl.value?.contains(target) && !pickerEl.value?.contains(target)) open.value = false
  }

  function onViewportChange() {
    if (open.value) updatePosition()
  }

  onMounted(() => {
    if (!import.meta.client) return
    window.addEventListener('pointerdown', onPointerDown, { capture: true })
    window.addEventListener('resize', onViewportChange, { passive: true })
    window.addEventListener('scroll', onViewportChange, { passive: true })
  })
  onBeforeUnmount(() => {
    if (!import.meta.client) return
    window.removeEventListener('pointerdown', onPointerDown, { capture: true } as EventListenerOptions)
    window.removeEventListener('resize', onViewportChange)
    window.removeEventListener('scroll', onViewportChange)
  })

  return { open, buttonDesktopRef, buttonMobileRef, pickerEl, pickerStyle, toggle, pick }
}
