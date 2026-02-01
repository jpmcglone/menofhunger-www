import type { Ref } from 'vue'
import type { ComposerMediaItem } from './types'
import { reorderInsertAt } from './types'

export function useComposerDragReorder(opts: { composerMedia: Ref<ComposerMediaItem[]>; maxSlots: number }) {
  const MEDIA_SLOTS = Math.max(1, Math.floor(opts.maxSlots))

  const draggingMediaId = ref<string | null>(null)
  const draggingPointerId = ref<number | null>(null)
  const dragFromSlotIndex = ref<number | null>(null)
  const dropTargetSlotIndex = ref<number | null>(null)
  const dragGhost = ref<null | { src: string; x: number; y: number; w: number; h: number; offsetX: number; offsetY: number }>(null)

  const dragGhostStyle = computed(() => {
    const g = dragGhost.value
    if (!g) return {}
    return {
      left: `${Math.round(g.x)}px`,
      top: `${Math.round(g.y)}px`,
      width: `${Math.round(g.w)}px`,
      height: `${Math.round(g.h)}px`,
    }
  })

  const displayOrder = computed(() => {
    const list = opts.composerMedia.value
    const from = dragFromSlotIndex.value
    const to = dropTargetSlotIndex.value
    if (from == null || to == null || from === to || draggingMediaId.value === null) return list
    return reorderInsertAt(list, from, to)
  })

  const displaySlots = computed(() => {
    const order = displayOrder.value
    const slots: Array<{ key: string; index: number; empty: boolean; item?: ComposerMediaItem }> = []
    for (let i = 0; i < MEDIA_SLOTS; i++) {
      if (i < order.length) {
        const item = order[i]
        if (item) slots.push({ key: item.localId, index: i, empty: false, item })
        else slots.push({ key: `empty-${i}`, index: i, empty: true })
      } else {
        slots.push({ key: `empty-${i}`, index: i, empty: true })
      }
    }
    return slots
  })

  const firstEmptySlotIndex = computed(() => {
    const idx = displaySlots.value.findIndex((s) => s.empty)
    return idx >= 0 ? idx : null
  })

  // Store current drag listeners so we can remove them on unmount if user navigates away during drag.
  let currentOnMove: ((ev: PointerEvent) => void) | null = null
  let currentOnUpOrCancel: ((ev: PointerEvent) => void) | null = null

  function removePointerListeners() {
    if (currentOnMove) {
      window.removeEventListener('pointermove', currentOnMove)
      currentOnMove = null
    }
    if (currentOnUpOrCancel) {
      window.removeEventListener('pointerup', currentOnUpOrCancel)
      window.removeEventListener('pointercancel', currentOnUpOrCancel)
      currentOnUpOrCancel = null
    }
    draggingMediaId.value = null
    draggingPointerId.value = null
    dragFromSlotIndex.value = null
    dropTargetSlotIndex.value = null
    dragGhost.value = null
  }

  onBeforeUnmount(() => {
    removePointerListeners()
  })

  function onMediaTilePointerDown(id: string, e: PointerEvent) {
    const target = e.target as HTMLElement | null
    if (target?.closest('button')) return

    const pid = (id ?? '').trim()
    if (!pid) return

    const slotEl = (e.currentTarget as HTMLElement | null)?.closest?.('[data-composer-slot-index]') as HTMLElement | null
    const slotIndex = slotEl ? parseInt(slotEl.dataset.composerSlotIndex ?? '', 10) : -1
    if (slotIndex < 0 || slotIndex >= MEDIA_SLOTS) return

    try {
      e.preventDefault()
    } catch {
      // ignore
    }

    draggingMediaId.value = pid
    draggingPointerId.value = e.pointerId
    dragFromSlotIndex.value = slotIndex
    dropTargetSlotIndex.value = slotIndex

    const item = opts.composerMedia.value.find((m) => m.localId === pid) ?? null
    const src = item?.previewUrl ?? ''
    const rect = (e.currentTarget as HTMLElement | null)?.getBoundingClientRect?.()
    if (src && rect) {
      dragGhost.value = {
        src,
        w: rect.width,
        h: rect.height,
        x: rect.left,
        y: rect.top,
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top,
      }
    } else {
      dragGhost.value = null
    }

    try {
      ;(e.currentTarget as HTMLElement | null)?.setPointerCapture?.(e.pointerId)
    } catch {
      // ignore
    }

    const onMove = (ev: PointerEvent) => {
      if (draggingPointerId.value !== ev.pointerId) return
      if (!draggingMediaId.value) return

      if (dragGhost.value) {
        dragGhost.value = {
          ...dragGhost.value,
          x: ev.clientX - dragGhost.value.offsetX,
          y: ev.clientY - dragGhost.value.offsetY,
        }
      }

      const under = document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null
      const slotUnder = under?.closest?.('[data-composer-slot-index]') as HTMLElement | null
      const toSlot = slotUnder ? parseInt(slotUnder.dataset.composerSlotIndex ?? '', 10) : null
      if (toSlot != null && toSlot >= 0 && toSlot < MEDIA_SLOTS) {
        dropTargetSlotIndex.value = toSlot
      }
    }

    const onUpOrCancel = (ev: PointerEvent) => {
      if (draggingPointerId.value !== ev.pointerId) return
      const from = dragFromSlotIndex.value
      const to = dropTargetSlotIndex.value
      removePointerListeners()
      if (from != null && to != null && from !== to) {
        opts.composerMedia.value = reorderInsertAt(opts.composerMedia.value, from, to)
      }
    }

    currentOnMove = onMove
    currentOnUpOrCancel = onUpOrCancel
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUpOrCancel)
    window.addEventListener('pointercancel', onUpOrCancel)
  }

  return {
    displaySlots,
    firstEmptySlotIndex,
    draggingMediaId,
    dragGhost,
    dragGhostStyle,
    onMediaTilePointerDown,
  }
}

