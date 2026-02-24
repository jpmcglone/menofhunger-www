<template>
  <div
    ref="wrapEl"
    :class="['relative shrink-0', roundClass, sizeClass, wrapClass]"
    :style="effectiveWrapStyle"
    aria-hidden="true"
  >
    <!-- Avatar (clipped to circle).
         When spacesRing is active, the outer wrapper has a gradient background + padding.
         The inner div uses the page background to create the visible ring gap. -->
    <div
      :class="['h-full w-full overflow-hidden', roundClass, spacesRing ? 'bg-[var(--moh-bg)]' : bgClass]"
    >
      <AppImg
        v-if="src"
        :src="src"
        alt=""
        class="h-full w-full object-cover"
        :width="imgSizePx"
        :height="imgSizePx"
        :sizes="`${imgSizePx}px`"
        loading="lazy"
        decoding="async"
      />
      <div v-else class="h-full w-full flex items-center justify-center">
        <span
          class="moh-avatar-initial leading-none"
          :style="initialStyle"
        >{{ initial }}</span>
      </div>
    </div>
    <!-- Presence: green (online), clock (idle), yellow (connecting); overlays bottom-right corner -->
    <template v-if="showPresence">
    <!-- Idle: show only the clock (no extra outer circle), same size as the online dot -->
    <span
      v-if="effectivePresenceStatus === 'idle'"
      class="absolute text-white"
      :style="presenceDotFullStyle"
      aria-hidden="true"
    >
      <!-- Filled clock with see-through hands -->
      <svg
        viewBox="0 0 24 24"
        class="h-full w-full p-[10%]"
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
        effectivePresenceStatus === 'online' ? 'border-white bg-green-500 dark:border-zinc-900 dark:bg-green-500' : '',
        effectivePresenceStatus === 'connecting' ? 'border-white bg-yellow-500 dark:border-zinc-900 dark:bg-yellow-500' : '',
        effectivePresenceStatus !== 'offline' ? '' : 'pointer-events-none'
      ]"
      :style="presenceDotFullStyle"
    />
    </template>
  </div>
</template>

<script setup lang="ts">
import AppImg from '~/components/app/AppImg.vue'
import { SPACES_GRADIENT } from '~/utils/theme-tint'
const props = withDefaults(
  defineProps<{
    src?: string | null
    name?: string | null
    username?: string | null
    sizeClass?: string
    bgClass?: string
    /** Border radius class for the avatar wrapper/clip. Default circle. */
    roundClass?: string
    /** Optional wrapper class for rings/glow. */
    wrapClass?: string
    /** Optional wrapper style for rings/glow. */
    wrapStyle?: Record<string, string>
    /** Premium+ users get an orange glow around the avatar. */
    premiumPlusGlow?: boolean
    /** Organization users keep a silver premium+ glow. */
    isOrganization?: boolean
    /** Show the Spaces gradient ring around the avatar (for users currently in a space). */
    spacesRing?: boolean
    /** When false, do not show the presence dot (e.g. radio bar listener avatars). */
    showPresence?: boolean
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
    roundClass: 'rounded-full',
    wrapClass: '',
    wrapStyle: () => ({}),
    premiumPlusGlow: false,
    isOrganization: false,
    spacesRing: false,
    showPresence: true,
    presenceStatus: 'offline',
    presenceScale: 0.25,
    presenceInsetRatio: 0.5,
  },
)

// Hydration safety: presence can change immediately on the client (socket connecting/online),
// which causes SSR/client class/style mismatches. Keep SSR + initial hydration stable, then
// apply live presence after mount.
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})

const effectivePresenceStatus = computed(() => (hydrated.value ? props.presenceStatus : 'offline'))

const wrapEl = ref<HTMLElement | null>(null)
const diameterPx = ref<number>(40)
const idleClockMaskId = `idle-clock-mask-${Math.random().toString(36).slice(2, 9)}`

const imgSizePx = computed(() => Math.max(16, Math.floor(diameterPx.value || 40)))

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

const premiumPlusGlowStyle = computed<Record<string, string>>(() => {
  if (!props.premiumPlusGlow) return {} as Record<string, string>
  const d = diameterPx.value
  // Scale glow with avatar size.
  const glowPx = Math.max(12, Math.round(d * 0.42))
  const glowPx2 = Math.max(glowPx + 8, Math.round(glowPx * 1.65))
  // Keep non-org premium+ glow orange regardless of viewer org theme.
  const glowRgb = props.isOrganization ? 'var(--moh-org-rgb)' : '199, 125, 26'
  return {
    boxShadow: `0 0 ${glowPx}px rgba(${glowRgb}, 0.28), 0 0 ${glowPx2}px rgba(${glowRgb}, 0.14)`,
  }
})

// Spaces ring: gradient border rendered as a padded gradient shell on the outer wrapper.
// The inner avatar div uses the page background to "cut" the visible ring.
const spacesRingStyle = computed<Record<string, string>>(() => {
  if (!props.spacesRing) return {}
  const d = diameterPx.value
  // Ring thickness scales with avatar size (~8% of diameter), min 2px.
  const ringPx = Math.max(2, Math.round(d * 0.08))
  return {
    background: SPACES_GRADIENT,
    padding: `${ringPx}px`,
  }
})

const effectiveWrapStyle = computed<Record<string, string>>(() => {
  // Apply Premium+ glow on the wrapper itself so we don't need any internal z-index layering.
  // Spaces ring uses gradient background + padding to create a border-like ring.
  // Caller-provided wrapStyle is applied last so it can override.
  return {
    ...(props.premiumPlusGlow ? premiumPlusGlowStyle.value : {}),
    ...(props.spacesRing ? spacesRingStyle.value : {}),
    ...(props.wrapStyle ?? {}),
  }
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
    opacity: effectivePresenceStatus.value !== 'offline' ? 1 : 0,
  }
})
</script>

