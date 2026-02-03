<template>
  <div
    ref="wrapEl"
    :class="['relative shrink-0', sizeClass]"
    aria-hidden="true"
  >
    <!-- Avatar (clipped to circle) -->
    <div
      :class="['h-full w-full overflow-hidden rounded-full', bgClass]"
    >
      <img
        v-if="src"
        :src="src"
        alt=""
        class="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      >
      <div v-else class="h-full w-full flex items-center justify-center">
        <span
          class="moh-avatar-initial leading-none"
          :style="initialStyle"
        >{{ initial }}</span>
      </div>
    </div>
    <!-- Presence: green (online), clock (idle), yellow (connecting); overlays bottom-right corner -->
    <span
      v-if="presenceStatus === 'idle'"
      class="absolute flex items-center justify-center rounded-full border-2 border-white text-white dark:border-zinc-900 dark:text-gray-400"
      :style="idleDotStyle"
      aria-hidden="true"
    >
      <!-- Filled clock with see-through hands (single shape, no extra circle behind) -->
      <svg
        viewBox="0 0 24 24"
        class="h-full w-full p-[15%]"
        fill="currentColor"
        aria-hidden="true"
      >
        <defs>
          <mask :id="idleClockMaskId">
            <circle cx="12" cy="12" r="10" fill="white" />
            <!-- Hands as cutouts (black = transparent in mask) -->
            <rect x="11" y="6" width="2" height="6" rx="1" fill="black" />
            <rect x="11" y="11" width="5" height="2" rx="1" fill="black" />
          </mask>
        </defs>
        <circle cx="12" cy="12" r="10" :mask="`url(#${idleClockMaskId})`" />
      </svg>
    </span>
    <span
      v-else
      :class="[
        'absolute rounded-full border-2 transition-opacity duration-200',
        presenceStatus === 'online' ? 'border-white bg-green-500 dark:border-zinc-900 dark:bg-green-500' : '',
        presenceStatus === 'connecting' ? 'border-white bg-yellow-500 dark:border-zinc-900 dark:bg-yellow-500' : '',
        presenceStatus !== 'offline' ? '' : 'pointer-events-none'
      ]"
      :style="presenceDotFullStyle"
    />
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src?: string | null
    name?: string | null
    username?: string | null
    sizeClass?: string
    bgClass?: string
    /** Presence state: green (online), clock (idle), yellow (connecting), or hidden (offline). */
    presenceStatus?: 'online' | 'idle' | 'connecting' | 'offline'
    /** Presence dot size as fraction of avatar diameter (default 0.25). Use smaller (e.g. 0.15) for large avatars. */
    presenceScale?: number
    /** How far the dot extends outside the avatar (0.5 = half out, 0.25 = closer). Default 0.5. */
    presenceInsetRatio?: number
  }>(),
  {
    src: null,
    name: null,
    username: null,
    sizeClass: 'h-10 w-10',
    bgClass: 'bg-gray-200 dark:bg-zinc-800',
    presenceStatus: 'offline',
    presenceScale: 0.25,
    presenceInsetRatio: 0.5,
  },
)

const wrapEl = ref<HTMLElement | null>(null)
const diameterPx = ref<number>(40)
const idleClockMaskId = `idle-clock-mask-${Math.random().toString(36).slice(2, 9)}`

function measure() {
  const el = wrapEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const d = Math.max(1, Math.min(r.width, r.height))
  diameterPx.value = d
}

onMounted(() => {
  measure()
  if (!import.meta.client) return
  const el = wrapEl.value
  if (!el) return

  const ro = new ResizeObserver(() => measure())
  ro.observe(el)
  onBeforeUnmount(() => ro.disconnect())
})

const initialStyle = computed<Record<string, string>>(() => {
  // Keep letter size proportional to avatar diameter.
  // (0.58 feels good for most sizes; adjust later if needed.)
  const d = diameterPx.value
  const fontPx = Math.max(10, Math.round(d * 0.58))
  const strokePx = Math.max(2, Math.round(fontPx * 0.14))
  return {
    fontSize: `${fontPx}px`,
    WebkitTextStrokeWidth: `${strokePx}px`,
  }
})

const initial = computed(() => {
  const raw = (props.name ?? props.username ?? '').trim()
  if (!raw) return '?'
  return raw.slice(0, 1).toUpperCase()
})

// Presence dot: sits outside avatar at bottom-right, overlaying the corner
const presenceDotFullStyle = computed<Record<string, string | number>>(() => {
  const d = diameterPx.value
  const scale = Math.max(0.1, Math.min(0.5, props.presenceScale ?? 0.25))
  const size = Math.max(6, Math.round(d * scale))
  const ratio = Math.max(0.1, Math.min(0.5, props.presenceInsetRatio ?? 0.5))
  const inset = Math.round(-size * ratio)
  return {
    width: `${size}px`,
    height: `${size}px`,
    bottom: `${inset}px`,
    right: `${inset}px`,
    opacity: props.presenceStatus !== 'offline' ? 1 : 0,
  }
})

// Idle dot: slightly larger than the green/other presence dots; no background so only the SVG clock shows
const idleDotStyle = computed<Record<string, string | number>>(() => {
  const d = diameterPx.value
  const baseScale = props.presenceScale ?? 0.25
  const scale = Math.max(0.1, Math.min(0.5, baseScale * 1.15))
  const size = Math.max(6, Math.round(d * scale))
  const ratio = Math.max(0.1, Math.min(0.5, props.presenceInsetRatio ?? 0.5))
  const inset = Math.round(-size * ratio)
  return {
    width: `${size}px`,
    height: `${size}px`,
    bottom: `${inset}px`,
    right: `${inset}px`,
  }
})
</script>

