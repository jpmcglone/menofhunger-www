<template>
  <ClientOnly>
    <Teleport to="body">
      <div
        v-if="visible && src && target"
        ref="rootEl"
        class="fixed inset-0 z-[9999] touch-none"
        role="dialog"
        aria-modal="true"
        :aria-label="alt"
        @click="onRootClick"
      >
        <div
          class="absolute inset-0 bg-black/70 transition-opacity duration-200"
          :class="backdropVisible ? 'opacity-100' : 'opacity-0'"
          aria-hidden="true"
        />

        <button
          type="button"
          class="moh-tap absolute right-4 top-4 z-10 rounded-full bg-black/45 p-2 text-white shadow-sm"
          aria-label="Close"
          @click.stop="onClose"
        >
          <i class="pi pi-times text-lg" aria-hidden="true" />
        </button>

        <button
          v-if="showNav"
          type="button"
          class="moh-tap absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white shadow-sm disabled:opacity-40"
          aria-label="Previous image"
          :disabled="!canPrev"
          @click.stop="onPrev"
        >
          <i class="pi pi-angle-left text-xl" aria-hidden="true" />
        </button>

        <button
          v-if="showNav"
          type="button"
          class="moh-tap absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white shadow-sm disabled:opacity-40"
          aria-label="Next image"
          :disabled="!canNext"
          @click.stop="onNext"
        >
          <i class="pi pi-angle-right text-xl" aria-hidden="true" />
        </button>

        <div
          v-if="showNav && counterLabel"
          class="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white"
          aria-hidden="true"
        >
          {{ counterLabel }}
        </div>

        <div class="relative h-full w-full">
          <video
            v-if="kind === 'media' && currentMediaItem?.kind === 'video'"
            ref="lightboxVideoEl"
            :src="src"
            :poster="currentMediaItem?.posterUrl ?? undefined"
            class="select-none object-contain will-change-transform"
            :style="imageStyle"
            controls
            controlsList="nodownload"
            playsinline
            autoplay
            :muted="lightboxVideoMuted"
            @click.stop
            @contextmenu.prevent
            @volumechange="onLightboxVideoVolumeChange"
            @transitionend="onTransitionEnd"
          />
          <!-- Small corner controls only (no dimming). Safari requires user gesture to unmute. -->
          <button
            v-if="kind === 'media' && currentMediaItem?.kind === 'video' && lightboxVideoMuted"
            type="button"
            class="absolute right-4 top-14 z-[5] flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            aria-label="Tap for sound"
            @click.stop="onLightboxTapUnmute"
          >
            <i class="pi pi-volume-off text-xl" aria-hidden="true" />
          </button>
          <button
            v-else-if="kind === 'media' && currentMediaItem?.kind === 'video' && !lightboxVideoMuted"
            type="button"
            class="absolute right-4 top-14 z-[5] flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            aria-label="Mute"
            @click.stop="onLightboxTapMute"
          >
            <i class="pi pi-volume-up text-xl" aria-hidden="true" />
          </button>
          <img
            v-else-if="kind === 'media'"
            :src="src"
            :alt="alt"
            class="select-none object-contain will-change-transform"
            :style="imageStyleForImage"
            draggable="false"
            @click.stop
            @transitionend="onTransitionEnd"
          >
          <img
            v-else
            :src="src"
            :alt="alt"
            class="select-none object-cover will-change-transform"
            :style="imageStyleForImage"
            draggable="false"
            @click.stop
            @transitionend="onTransitionEnd"
          >
        </div>
      </div>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { DragGesture, PinchGesture, type UserPinchConfig } from '@use-gesture/vanilla'
import type { LightboxMediaItem } from '~/composables/useImageLightbox'
import type { StyleValue } from 'vue'

const props = defineProps<{
  visible: boolean
  backdropVisible: boolean
  src: string | null
  alt: string
  kind?: 'avatar' | 'banner' | 'media'
  currentMediaItem?: LightboxMediaItem | null
  target: unknown
  imageStyle: StyleValue
  showNav?: boolean
  canPrev?: boolean
  canNext?: boolean
  counterLabel?: string | null
  onPrev?: () => void
  onNext?: () => void
  onClose: () => void
  onTransitionEnd: (e: TransitionEvent) => void
}>()

const { appWideSoundOn } = useEmbeddedVideoManager()
const lightboxVideoEl = ref<HTMLVideoElement | null>(null)
/** Lightbox video always starts muted; unmute only on user tap (Safari). */
const lightboxVideoMuted = ref(true)
const rootEl = ref<HTMLElement | null>(null)

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function pxToNumber(v: unknown): number | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  if (!s.endsWith('px')) return null
  const n = Number(s.slice(0, -2))
  return Number.isFinite(n) ? n : null
}

function styleValueToObject(s: StyleValue): Record<string, any> {
  if (!s) return {}
  if (typeof s === 'string') return {}
  if (Array.isArray(s)) {
    const out: Record<string, any> = {}
    for (const item of s) {
      if (item && typeof item === 'object' && !Array.isArray(item)) Object.assign(out, item)
    }
    return out
  }
  if (typeof s === 'object') return s as any
  return {}
}

const baseStyleObj = computed(() => styleValueToObject(props.imageStyle))

// Zoom/pan state (pinch + double-tap).
const zoom = ref(1)
const panX = ref(0)
const panY = ref(0)

const gestureEnabled = computed(() => {
  if (!props.visible) return false
  // Avoid fighting native video controls.
  if (props.kind === 'media' && props.currentMediaItem?.kind === 'video') return false
  return true
})

function clampPan(nextX: number, nextY: number) {
  const w = pxToNumber(baseStyleObj.value?.width) ?? 0
  const h = pxToNumber(baseStyleObj.value?.height) ?? 0
  // Keep pan bounded to the scaled container.
  const maxX = Math.max(0, (w * (zoom.value - 1)) / 2)
  const maxY = Math.max(0, (h * (zoom.value - 1)) / 2)
  panX.value = clamp(nextX, -maxX, maxX)
  panY.value = clamp(nextY, -maxY, maxY)
}

function resetZoom() {
  zoom.value = 1
  panX.value = 0
  panY.value = 0
}

const imageStyleForImage = computed<StyleValue>(() => {
  const base = { ...baseStyleObj.value }
  // Preserve the open/close animation transform and append our zoom/pan after it.
  const baseTransform = typeof base.transform === 'string' ? base.transform : ''
  const z = zoom.value
  const x = Math.floor(panX.value)
  const y = Math.floor(panY.value)
  const extra = z > 1.001 ? ` translate3d(${x}px, ${y}px, 0px) scale(${z})` : ''
  base.transform = `${baseTransform}${extra}`.trim()
  return base
})

const suppressClick = ref(false)

const swipeEnabled = computed(() => {
  if (!props.visible) return false
  if (props.kind !== 'media') return false
  if (!props.showNav) return false
  // Avoid interfering with native video controls.
  if (props.currentMediaItem?.kind === 'video') return false
  // When zoomed, use gestures for pan/zoom, not navigation.
  if (zoom.value > 1.01) return false
  return true
})

type ClientXY = { x: number; y: number }
function getClientXY(event: unknown): ClientXY | null {
  if (!event || typeof event !== 'object') return null
  // PointerEvent / MouseEvent
  if ('clientX' in event && 'clientY' in event) {
    const x = Number((event as any).clientX)
    const y = Number((event as any).clientY)
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  }
  // TouchEvent
  const touches = (event as any).touches as ArrayLike<any> | undefined
  if (touches && touches.length) {
    const t = touches[0]
    const x = Number(t?.clientX)
    const y = Number(t?.clientY)
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  }
  const changed = (event as any).changedTouches as ArrayLike<any> | undefined
  if (changed && changed.length) {
    const t = changed[0]
    const x = Number(t?.clientX)
    const y = Number(t?.clientY)
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  }
  return null
}

function onRootClick() {
  // If the user just swiped, don't treat the final tap/click as a backdrop close.
  if (suppressClick.value) {
    suppressClick.value = false
    return
  }
  props.onClose()
}

let tapStart = { x: 0, y: 0, at: 0 }
let lastTap = { x: 0, y: 0, at: 0 }
let dragStartPan = { x: 0, y: 0 }
let pinchStart: null | { z0: number; p0x: number; p0y: number; u0x: number; u0y: number; cx: number; cy: number } = null

const H_SWIPE_PX = 60
const V_SWIPE_PX = 90

function handleTapAt(x: number, y: number) {
  const now = Date.now()
  const dx = x - tapStart.x
  const dy = y - tapStart.y
  const moved = Math.sqrt(dx * dx + dy * dy)
  const isTap = moved < 10 && now - tapStart.at < 350
  if (!isTap) return

  const isDouble = now - lastTap.at < 260 && Math.abs(x - lastTap.x) < 24 && Math.abs(y - lastTap.y) < 24
  if (isDouble) {
    suppressClick.value = true
    if (zoom.value > 1.01) resetZoom()
    else {
      zoom.value = 2.5
      clampPan(0, 0)
    }
    lastTap = { x: 0, y: 0, at: 0 }
    return
  }
  lastTap = { x, y, at: now }
}

watchEffect((onCleanup) => {
  if (!import.meta.client) return
  const el = rootEl.value
  if (!el) return
  if (!gestureEnabled.value) return

  const drag = new DragGesture(
    el,
    ({ first, last, movement: [mx, my], tap, event }) => {
      // Track tap start for double-tap detection.
      if (first) {
        const xy = getClientXY(event) ?? { x: 0, y: 0 }
        tapStart = { x: xy.x, y: xy.y, at: Date.now() }
        dragStartPan = { x: panX.value, y: panY.value }
      }

      // When zoomed: drag = pan.
      if (zoom.value > 1.01) {
        clampPan(dragStartPan.x + mx, dragStartPan.y + my)
        suppressClick.value = true
        if (last && tap) {
          // Allow double-tap toggle even if currently zoomed.
          const xy = getClientXY(event)
          if (xy) handleTapAt(xy.x, xy.y)
        }
        return
      }

      // Not zoomed: on release, interpret as swipe/dismiss or a tap.
      if (last) {
        if (tap) {
          const xy = getClientXY(event)
          if (xy) handleTapAt(xy.x, xy.y)
          return
        }

        if (!swipeEnabled.value) return

        const ax = Math.abs(mx)
        const ay = Math.abs(my)

        if (ax >= H_SWIPE_PX && ax > ay * 1.2) {
          suppressClick.value = true
          if (mx < 0) props.onNext?.()
          else props.onPrev?.()
          return
        }
        if (my >= V_SWIPE_PX && ay > ax * 1.2) {
          suppressClick.value = true
          props.onClose()
        }
      }
    },
    {
      // Keep the gesture responsive; we handle thresholds ourselves.
      threshold: 0,
      filterTaps: true,
    },
  )

  const pinchConfig: UserPinchConfig = {
    // Start pinch scaling from the current zoom value.
    from: () => [zoom.value, 0],
    scaleBounds: { min: 1, max: 4 },
    rubberband: false,
  }

  const pinch = new PinchGesture(
    el,
    ({ first, last, offset: [s], origin: [ox, oy] }) => {
      if (first) {
        suppressClick.value = true
        const w = pxToNumber(baseStyleObj.value?.width) ?? 0
        const h = pxToNumber(baseStyleObj.value?.height) ?? 0
        const left = pxToNumber(baseStyleObj.value?.left) ?? 0
        const top = pxToNumber(baseStyleObj.value?.top) ?? 0

        const cx = w > 0 ? left + w / 2 : window.innerWidth / 2
        const cy = h > 0 ? top + h / 2 : window.innerHeight / 2

        const z0 = Math.max(1, zoom.value)
        const p0x = panX.value
        const p0y = panY.value

        // Local coordinate under the pinch origin, expressed in "unscaled" space.
        const u0x = (ox - cx - p0x) / z0
        const u0y = (oy - cy - p0y) / z0
        pinchStart = { z0, p0x, p0y, u0x, u0y, cx, cy }
      }

      const nextZoom = clamp(s, 1, 4)
      zoom.value = nextZoom

      if (pinchStart) {
        // Anchor the pinch origin so it feels stable under the fingers.
        const p1x = ox - pinchStart.cx - nextZoom * pinchStart.u0x
        const p1y = oy - pinchStart.cy - nextZoom * pinchStart.u0y
        clampPan(p1x, p1y)
      }

      if (last) pinchStart = null
    },
    pinchConfig,
  )

  onCleanup(() => {
    drag.destroy()
    pinch.destroy()
  })
})

watch(
  () => [props.currentMediaItem?.kind, props.src] as const,
  () => {
    if (props.kind === 'media' && props.currentMediaItem?.kind === 'video') {
      lightboxVideoMuted.value = true
    }
    resetZoom()
  },
)

function onLightboxVideoVolumeChange(e: Event) {
  const el = e.target as HTMLVideoElement
  if (el) {
    lightboxVideoMuted.value = el.muted
    appWideSoundOn.value = !el.muted
  }
}

function onLightboxTapUnmute() {
  const el = lightboxVideoEl.value
  if (el) {
    el.muted = false
    lightboxVideoMuted.value = false
    appWideSoundOn.value = true
    el.play().catch(() => {})
  }
}

function onLightboxTapMute() {
  const el = lightboxVideoEl.value
  if (el) {
    el.muted = true
    lightboxVideoMuted.value = true
    appWideSoundOn.value = false
  }
}
</script>

