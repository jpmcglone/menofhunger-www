<template>
  <div class="w-full">
    <div
      ref="trackEl"
      class="relative w-full select-none rounded-full border border-gray-300 bg-white/70 px-1 py-1 dark:border-zinc-700 dark:bg-black/40"
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
        class="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-white shadow-sm transition-colors dark:border-zinc-700 dark:bg-black"
        :class="disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'"
        :style="{ transform: `translateX(${x}px)` }"
        :disabled="disabled"
        role="slider"
        aria-label="Slide to reveal"
        :aria-valuemin="0"
        :aria-valuemax="100"
        :aria-valuenow="Math.round(progress * 100)"
        @pointerdown="onPointerDown"
        @keydown="onKeyDown"
      >
        <i class="pi pi-angle-right text-lg text-gray-700 dark:text-gray-200" aria-hidden="true" />
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

// Store current drag listeners so we can remove them on unmount if user navigates away during drag.
let activePointerOnMove: ((ev: PointerEvent) => void) | null = null
let activePointerOnUp: ((ev: PointerEvent) => void) | null = null

onBeforeUnmount(() => {
  if (!import.meta.client) return
  window.removeEventListener('resize', measure)
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
  window.setTimeout(() => emit('revealed'), 120)
}

function onPointerDown(e: PointerEvent) {
  if (props.disabled) return
  if (completed.value) return
  const handle = handleEl.value as HTMLElement | null
  const track = trackEl.value as HTMLElement | null
  if (!handle || !track) return

  measure()
  handle.setPointerCapture(e.pointerId)

  const trackRect = track.getBoundingClientRect()
  const handleRect = handle.getBoundingClientRect()
  const offsetInHandle = e.clientX - handleRect.left

  const onMove = (ev: PointerEvent) => {
    const raw = ev.clientX - trackRect.left - offsetInHandle
    x.value = Math.max(0, Math.min(maxX.value, raw))
  }

  const onUp = (ev: PointerEvent) => {
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
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
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
button {
  transition: transform 140ms ease;
}

</style>

