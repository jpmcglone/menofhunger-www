<template>
  <div
    class="relative w-full h-full overflow-hidden"
    :class="[
      backgroundOnly ? '' : 'rounded-xl',
      backgroundOnly ? '' : (isDark ? 'bg-zinc-950' : 'bg-zinc-100'),
    ]"
  >
    <canvas ref="canvasEl" class="absolute inset-0 w-full h-full" />

    <!-- Paused overlay + Live pill only when not in background-only (e.g. radio bar) -->
    <template v-if="!backgroundOnly">
      <Transition name="moh-fade">
        <div
          v-if="!isPlaying"
          class="absolute inset-0 flex flex-col items-center justify-center gap-3 select-none pointer-events-none"
        >
          <Icon name="tabler:music" class="text-4xl opacity-20" :style="{ color: palette.cssTop }" aria-hidden="true" />
          <p class="text-xs font-medium" :class="isDark ? 'text-zinc-500' : 'text-zinc-400'">Play a station to see the visualizer</p>
        </div>
      </Transition>
      <Transition name="moh-fade">
        <div
          v-if="isPlaying"
          class="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full backdrop-blur-sm px-2.5 py-1 pointer-events-none select-none"
          :class="isDark ? 'bg-black/40' : 'bg-white/60'"
        >
          <span class="h-1.5 w-1.5 rounded-full animate-pulse" :style="{ backgroundColor: palette.cssTop }" aria-hidden="true" />
          <span class="text-[10px] font-semibold uppercase tracking-widest" :style="{ color: palette.cssMid }">Live</span>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { getSpaceAudioAnalyser } from '~/composables/useSpaceAudio'
import { userColorTier, type UserColorTier } from '~/utils/user-tier'

const props = withDefaults(
  defineProps<{ backgroundOnly?: boolean }>(),
  { backgroundOnly: false },
)

const { isPlaying } = useSpaceAudio()
const { user } = useAuth()
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

const tier = computed<UserColorTier>(() => userColorTier(user.value as any))

// ─── Per-tier colour palettes ───────────────────────────────────────────────
type Rgb = [number, number, number]
type TierPalette = { top: Rgb; mid: Rgb; base: Rgb; peak: Rgb; idle: Rgb }

const PALETTES: Record<UserColorTier, TierPalette> = {
  // amber / gold (default)
  normal: {
    top:  [251, 191,  36],
    mid:  [217, 119,   6],
    base: [120,  53,  15],
    peak: [253, 224,  71],
    idle: [163, 116,  34],
  },
  // orange  (--moh-premium)
  premium: {
    top:  [251, 146,  60],
    mid:  [199, 125,  26],
    base: [124,  45,  18],
    peak: [253, 186, 116],
    idle: [199, 125,  26],
  },
  // blue  (--moh-verified)
  verified: {
    top:  [ 96, 165, 250],
    mid:  [ 43, 123, 185],
    base: [ 30,  58, 138],
    peak: [147, 197, 253],
    idle: [ 43, 123, 185],
  },
  // silver  (--moh-org)
  organization: {
    top:  [203, 213, 225],
    mid:  [138, 147, 163],
    base: [ 71,  85, 105],
    peak: [226, 232, 240],
    idle: [138, 147, 163],
  },
}

function rgb(c: Rgb, a = 1) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`
}

const palette = computed(() => {
  const p = PALETTES[tier.value]
  return {
    ...p,
    cssTop: rgb(p.top),
    cssMid: rgb(p.mid),
  }
})

// ─── Canvas / RAF ────────────────────────────────────────────────────────────
const canvasEl = ref<HTMLCanvasElement | null>(null)

let rafId: number | null = null
let analyser: AnalyserNode | null = null
let dataArray: Uint8Array<ArrayBuffer> | null = null

const BAR_COUNT = 48
const GAP = 6
const BAR_SMOOTHING = 0.22 // lerp factor: higher = snappier, lower = smoother
let peaks: Float32Array = new Float32Array(BAR_COUNT)
let peakHoldFrames: Uint8Array = new Uint8Array(BAR_COUNT)
let smoothedBars: Float32Array = new Float32Array(BAR_COUNT)
const PEAK_HOLD = 18
const PEAK_DECAY = 0.013

let ro: ResizeObserver | null = null

function setupCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
}

function draw() {
  rafId = requestAnimationFrame(draw)

  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = canvas.width
  const H = canvas.height
  const dark = isDark.value
  const p = palette.value

  if (!analyser) {
    analyser = getSpaceAudioAnalyser()
    if (analyser) dataArray = new Uint8Array(analyser.frequencyBinCount)
  }

  ctx.clearRect(0, 0, W, H)

  // Subtle horizontal guide lines (tone adapts to mode)
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'
  ctx.lineWidth = 1
  for (let y = H * 0.25; y < H; y += H * 0.25) {
    ctx.beginPath()
    ctx.moveTo(0, Math.round(y))
    ctx.lineTo(W, Math.round(y))
    ctx.stroke()
  }

  if (!analyser || !dataArray) {
    drawIdleLine(ctx, W, H, p, dark)
    return
  }

  analyser.getByteFrequencyData(dataArray)

  const totalGap = GAP * (BAR_COUNT - 1)
  const barW = Math.max(2, (W - totalGap) / BAR_COUNT)
  const binRange = Math.floor(analyser.frequencyBinCount * 0.6)

  for (let i = 0; i < BAR_COUNT; i++) {
    const binIdx = Math.floor((i / BAR_COUNT) * binRange)
    const raw = (dataArray[binIdx] ?? 0) / 255
    smoothedBars[i] = smoothedBars[i]! + (raw - smoothedBars[i]!) * BAR_SMOOTHING
    const smooth = smoothedBars[i]!

    const barH = Math.max(3, smooth * H * 0.85)
    const x = i * (barW + GAP)
    const y = H - barH

    // Vertical gradient: bright at top, dim at base (use smoothed for display)
    const grad = ctx.createLinearGradient(0, y, 0, H)
    grad.addColorStop(0,   rgb(p.top,  0.55 + smooth * 0.45))
    grad.addColorStop(0.5, rgb(p.mid,  0.40 + smooth * 0.30))
    grad.addColorStop(1,   rgb(p.base, dark ? 0.15 : 0.10))

    ctx.fillStyle = grad
    ctx.beginPath()
    const r = Math.min(4, barW / 2)
    if (ctx.roundRect) {
      ctx.roundRect(x, y, barW, barH, [r, r, 0, 0])
    } else {
      ctx.rect(x, y, barW, barH)
    }
    ctx.fill()

    // Subtle reflection
    const reflH = barH * 0.3
    const reflGrad = ctx.createLinearGradient(0, H, 0, H + reflH)
    reflGrad.addColorStop(0, rgb(p.top, 0.10 + smooth * 0.06))
    reflGrad.addColorStop(1, rgb(p.top, 0))
    ctx.fillStyle = reflGrad
    ctx.beginPath()
    ctx.rect(x, H, barW, reflH)
    ctx.fill()

    // Peak cap
    if (raw > peaks[i]!) {
      peaks[i] = raw
      peakHoldFrames[i] = PEAK_HOLD
    } else {
      if (peakHoldFrames[i]! > 0) peakHoldFrames[i]!--
      else peaks[i] = Math.max(0, peaks[i]! - PEAK_DECAY)
    }

    const peakVal = peaks[i]!
    if (peakVal > 0.02) {
      const py = H - peakVal * H * 0.85 - 4
      const alpha = Math.min(1, peakVal * 2)
      ctx.fillStyle = rgb(p.peak, alpha * 0.9)
      ctx.beginPath()
      if (ctx.roundRect) {
        ctx.roundRect(x, py, barW, 3, 2)
      } else {
        ctx.rect(x, py, barW, 3)
      }
      ctx.fill()
    }
  }
}

function drawIdleLine(ctx: CanvasRenderingContext2D, W: number, H: number, p: TierPalette, dark: boolean) {
  const y = H - 2
  const alpha = dark ? 0.22 : 0.15
  const grad = ctx.createLinearGradient(0, 0, W, 0)
  grad.addColorStop(0,   rgb(p.idle, 0))
  grad.addColorStop(0.2, rgb(p.idle, alpha))
  grad.addColorStop(0.8, rgb(p.idle, alpha))
  grad.addColorStop(1,   rgb(p.idle, 0))
  ctx.fillStyle = grad
  ctx.fillRect(0, y, W, 2)
}

function startLoop() {
  if (rafId !== null) return
  draw()
}

function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
}

onMounted(() => {
  const canvas = canvasEl.value
  if (!canvas) return

  setupCanvas(canvas)

  ro = new ResizeObserver(() => {
    if (canvasEl.value) setupCanvas(canvasEl.value)
  })
  ro.observe(canvas)

  startLoop()
})

onBeforeUnmount(() => {
  stopLoop()
  ro?.disconnect()
  ro = null
  peaks = new Float32Array(BAR_COUNT)
  peakHoldFrames = new Uint8Array(BAR_COUNT)
  smoothedBars = new Float32Array(BAR_COUNT)
})
</script>
