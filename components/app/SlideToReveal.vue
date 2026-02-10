<template>
  <div class="w-full">
    <div
      ref="trackEl"
      class="moh-slide-track relative w-full select-none rounded-full border border-gray-300 bg-white/70 px-1 py-1 dark:border-zinc-700 dark:bg-black/40"
      :aria-disabled="disabled ? 'true' : 'false'"
    >
      <div
        class="pointer-events-none absolute inset-0 flex items-center justify-center px-12 text-xs font-semibold tracking-wide text-gray-700 dark:text-gray-200"
      >
        {{ completed ? completedLabel : label }}
      </div>

      <button
        ref="handleEl"
        type="button"
        class="moh-slide-handle relative z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-white shadow-sm transition-colors dark:border-zinc-700 dark:bg-black"
        :class="[
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing',
          dragging ? 'moh-slide-handle--dragging' : ''
        ]"
        :style="{ transform: `translateX(${x}px)` }"
        :disabled="disabled"
        role="slider"
        aria-label="Slide to reveal"
        :aria-valuemin="0"
        :aria-valuemax="100"
        :aria-valuenow="Math.round(progress * 100)"
        @pointerdown="onPointerDown"
        @dragstart.prevent
        @keydown="onKeyDown"
      >
        <Icon name="tabler:chevron-right" class="text-lg text-gray-700 dark:text-gray-200" aria-hidden="true" />
      </button>
    </div>

    <div v-if="hint" class="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
      {{ hint }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label?: string
    completedLabel?: string
    hint?: string
    disabled?: boolean
  }>(),
  {
    label: 'Slide to reveal',
    completedLabel: 'Revealed',
    hint: 'Drag the handle to the right',
    disabled: false,
  },
)

const emit = defineEmits<{
  (e: 'revealed'): void
}>()

const trackEl = ref<HTMLElement | null>(null)
const handleEl = ref<HTMLElement | null>(null)

const x = ref(0)
const maxX = ref(1)
const handleWidth = ref(40)
const completed = ref(false)
const progress = computed(() => (maxX.value > 0 ? x.value / maxX.value : 0))
const dragging = ref(false)

function measure() {
  const track = trackEl.value?.getBoundingClientRect()
  const handle = handleEl.value?.getBoundingClientRect()
  if (!track || !handle) return
  handleWidth.value = Math.max(20, Math.floor(handle.width))
  maxX.value = Math.max(1, Math.floor(track.width - handle.width - 2)) // -2 for borders
  x.value = Math.min(x.value, maxX.value)
}

onMounted(() => {
  measure()
  if (!import.meta.client) return
  window.addEventListener('resize', measure)
})

let ro: ResizeObserver | null = null
watch([trackEl, handleEl], ([track, handle]) => {
  if (!import.meta.client) return
  ro?.disconnect()
  ro = null
  if (!track || !handle) return
  ro = new ResizeObserver(() => measure())
  ro.observe(track)
  ro.observe(handle)
}, { immediate: true })

// Store current drag listeners so we can remove them on unmount if user navigates away during drag.
let activePointerOnMove: ((ev: PointerEvent) => void) | null = null
let activePointerOnUp: ((ev: PointerEvent) => void) | null = null
let revealTimer: number | null = null

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('resize', measure)
  ro?.disconnect()
  ro = null
  dragging.value = false
  if (revealTimer != null) {
    window.clearTimeout(revealTimer)
    revealTimer = null
  }
  if (activePointerOnMove) {
    window.removeEventListener('pointermove', activePointerOnMove)
    activePointerOnMove = null
  }
  if (activePointerOnUp) {
    window.removeEventListener('pointerup', activePointerOnUp)
    window.removeEventListener('pointercancel', activePointerOnUp)
    activePointerOnUp = null
  }
})

function reset() {
  completed.value = false
  x.value = 0
}

function complete() {
  if (completed.value) return
  completed.value = true
  x.value = maxX.value
  // Small delay so the UI reaches the end before we reveal the screen.
  if (revealTimer != null) window.clearTimeout(revealTimer)
  revealTimer = window.setTimeout(() => {
    revealTimer = null
    emit('revealed')
  }, 120)
}

function onPointerDown(e: PointerEvent) {
  if (props.disabled) return
  if (completed.value) return
  // Only primary pointer + left click.
  if (e.isPrimary === false) return
  if (typeof e.button === 'number' && e.button !== 0) return

  const handle = handleEl.value as HTMLElement | null
  const track = trackEl.value as HTMLElement | null
  if (!handle || !track) return

  // Prevent scroll/selection glitches on mobile while dragging.
  try {
    e.preventDefault()
  } catch {
    // ignore
  }

  dragging.value = true
  measure()
  const pointerId = e.pointerId
  try {
    handle.setPointerCapture(pointerId)
  } catch {
    // Some browsers can throw; dragging still works via window listeners.
  }

  const trackRect = track.getBoundingClientRect()
  const handleRect = handle.getBoundingClientRect()
  const offsetInHandle = e.clientX - handleRect.left

  const onMove = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return
    try {
      ev.preventDefault()
    } catch {
      // ignore
    }
    const raw = ev.clientX - trackRect.left - offsetInHandle
    x.value = Math.max(0, Math.min(maxX.value, raw))
  }

  const onUp = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return
    dragging.value = false
    try {
      handle.releasePointerCapture(ev.pointerId)
    } catch {
      // ignore
    }
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
    activePointerOnMove = null
    activePointerOnUp = null

    if (progress.value >= 0.92) {
      complete()
      return
    }

    // Snap back.
    x.value = 0
  }

  activePointerOnMove = onMove
  activePointerOnUp = onUp
  window.addEventListener('pointermove', onMove, { passive: false })
  window.addEventListener('pointerup', onUp, { passive: true })
  window.addEventListener('pointercancel', onUp, { passive: true })
}

function onKeyDown(e: KeyboardEvent) {
  if (props.disabled) return
  if (completed.value) return

  const step = Math.max(8, Math.round(maxX.value * 0.12))
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    x.value = Math.min(maxX.value, x.value + step)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    x.value = Math.max(0, x.value - step)
  } else if (e.key === 'Home') {
    e.preventDefault()
    x.value = 0
  } else if (e.key === 'End') {
    e.preventDefault()
    x.value = maxX.value
  } else if (e.key === 'Enter' || e.key === ' ') {
    // Still requires multiple presses to complete; no single-click bypass.
    e.preventDefault()
    x.value = Math.min(maxX.value, x.value + step)
  } else if (e.key === 'Escape') {
    e.preventDefault()
    reset()
  }

  if (progress.value >= 0.92) complete()
}
</script>

<style scoped>
/* Safari: avoid animating transform during drag (causes jitter/lag). */
.moh-slide-handle {
  transition: transform 140ms ease;
  will-change: transform;
}

.moh-slide-handle--dragging {
  transition: none !important;
}

.moh-slide-track,
.moh-slide-handle {
  /* Critical for mobile Safari: prevent page scroll during drag. */
  touch-action: none;
}

</style>

