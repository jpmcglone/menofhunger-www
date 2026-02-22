<template>
  <div
    class="relative w-full h-full overflow-hidden"
    :class="[
      backgroundOnly ? '' : 'rounded-xl',
      backgroundOnly ? '' : 'bg-black',
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
          <p class="text-xs font-medium text-zinc-500">Hit play to tune in</p>
        </div>
      </Transition>
      <Transition name="moh-fade">
        <div
          v-if="isPlaying"
          class="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full backdrop-blur-sm px-2.5 py-1 pointer-events-none select-none bg-black/40"
        >
          <span class="h-1.5 w-1.5 rounded-full animate-pulse" :style="{ backgroundColor: palette.cssTop }" aria-hidden="true" />
          <span class="text-[10px] font-semibold uppercase tracking-widest" :style="{ color: palette.cssMid }">Live</span>
        </div>
      </Transition>

      <!-- Play / pause button — top-right corner -->
      <button
        type="button"
        aria-label="Toggle playback"
        class="absolute top-3 right-3 flex items-center justify-center rounded-full backdrop-blur-sm transition-opacity hover:opacity-100 focus:outline-none"
        :class="[
          'bg-black/40 hover:bg-black/60',
          'opacity-100',
        ]"
        style="width: 36px; height: 36px;"
        @click="toggle"
      >
        <Icon
          v-if="isBuffering"
          name="tabler:loader-2"
          size="18"
          class="animate-spin"
          :style="{ color: palette.cssTop }"
          aria-hidden="true"
        />
        <Icon
          v-else-if="isPlaying"
          name="tabler:player-pause-filled"
          size="18"
          :style="{ color: palette.cssTop }"
          aria-hidden="true"
        />
        <Icon
          v-else
          name="tabler:player-play-filled"
          size="18"
          :style="{ color: palette.cssTop }"
          aria-hidden="true"
        />
      </button>
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

const { isPlaying, toggle, isBuffering } = useSpaceAudio()
const { user } = useAuth()

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

// Bass smoothing for kick flash — snappier than bars so it feels punchy.
let smoothedBass = 0
const BASS_SMOOTHING = 0.30
// Proportion of frequency bins that count as "bass" (roughly 0–200 Hz).
const BASS_BIN_FRACTION = 0.06

// Slow-rolling overall energy average — drives background brightness.
// ~80-frame lag at 60 fps ≈ 1.3 s response time: tracks song sections, not beats.
let slowAvgEnergy = 0
const SLOW_AVG_SMOOTHING = 0.012

// Beat detection — compares instantaneous bass to a short rolling average.
// When bass spikes >35% above its own recent mean, we emit a ring.
let beatAvgBass = 0
const BEAT_AVG_SMOOTHING = 0.05
let lastBeatEmitTime = -Infinity
const BEAT_MIN_INTERVAL_S = 0.20   // ~300 BPM ceiling; real music max is ~180
// Active beat rings: { emitTime } — drawn in draw(), removed when expired.
interface BeatRing { emitTime: number }
const beatRings: BeatRing[] = []
const BEAT_RING_MAX = 6
const BEAT_RING_DURATION_S = 1.1

let ro: ResizeObserver | null = null

function setupCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
}

// ─── Background ──────────────────────────────────────────────────────────────
const RING_COUNT = 3
const RING_CYCLE_S = 5

function drawBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  p: TierPalette,
  dark: boolean,
  t: number,
  bassEnergy: number,  // 0–1 snappy bass
  slowAvg: number,     // 0–1 slow rolling average
) {
  const cx = W / 2
  const dpr = window.devicePixelRatio || 1
  const minDim = Math.min(W, H)

  // Radial glow from the bottom centre — spreads in all directions naturally.
  // Outer radius grows with music so the glow climbs higher and spreads wider.
  // Using a radius larger than the canvas means the fade is always gradual within
  // the viewport (we never reach the fully-transparent end inside the canvas).
  const maxDim = Math.max(W, H)
  const glowRadius = maxDim * (0.90 + slowAvg * 0.75 + bassEnergy * 0.35)

  // Brightness range: clearly dim at silence, clearly bright at full energy.
  const coreAlpha = Math.min(0.92, 0.38 + slowAvg * 0.42 + bassEnergy * 0.30)
  const midAlpha  = Math.min(0.55, 0.18 + slowAvg * 0.26 + bassEnergy * 0.18)
  const rimAlpha  = Math.min(0.18, slowAvg * 0.14 + bassEnergy * 0.08)

  // Point source at bottom centre — gradient fans upward into the canvas.
  const glowGrad = ctx.createRadialGradient(cx, H, 0, cx, H, glowRadius)
  glowGrad.addColorStop(0.00, rgb(p.mid,  coreAlpha))
  glowGrad.addColorStop(0.20, rgb(p.mid,  midAlpha))
  glowGrad.addColorStop(0.45, rgb(p.base, rimAlpha))
  glowGrad.addColorStop(0.70, rgb(p.base, rimAlpha * 0.4))
  glowGrad.addColorStop(1.00, rgb(p.base, 0))
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 0, W, H)

  // Dot grid — readable but not distracting.
  const GRID = Math.round(28 * dpr)
  const DOT_R = Math.max(1, dpr)
  ctx.fillStyle = rgb(p.idle, 0.11)
  for (let gx = GRID / 2; gx < W; gx += GRID) {
    for (let gy = GRID / 2; gy < H; gy += GRID) {
      ctx.beginPath()
      ctx.arc(gx, gy, DOT_R, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // Ambient sonar rings — centred in the middle; brighter so they read clearly.
  for (let i = 0; i < RING_COUNT; i++) {
    const phase = (t / RING_CYCLE_S + i / RING_COUNT) % 1
    const radius = phase * minDim * 0.46
    const alpha  = Math.sin(phase * Math.PI) * 0.14
    ctx.strokeStyle = rgb(p.top, alpha)
    ctx.lineWidth = Math.max(1.5, 1.5 * dpr)
    ctx.beginPath()
    ctx.arc(cx, H * 0.5, radius, 0, Math.PI * 2)
    ctx.stroke()
  }
}

// ─── Particles ───────────────────────────────────────────────────────────────
interface Particle {
  baseX: number   // normalised base horizontal position
  vy: number      // normalised vertical speed (fraction of H per second)
  phase: number   // random phase — controls y-start, twinkle, and sway timing
  size: number    // logical radius in CSS px
  alpha: number   // peak opacity for this particle
  usePeak: boolean // true → tinted with p.peak for variety
}

const PARTICLE_COUNT = 48
const _particles: Particle[] = []

function ensureParticles() {
  if (_particles.length === PARTICLE_COUNT) return
  _particles.length = 0
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    _particles.push({
      baseX:   Math.random(),
      vy:      0.055 + Math.random() * 0.085,  // full-height drift: ~7–18 s (visible movement)
      phase:   Math.random() * Math.PI * 2,
      size:    0.35 + Math.random() * 0.55,     // 0.35–0.9 CSS px — dust/grain, not blobs
      alpha:   0.22 + Math.random() * 0.32,     // 0.22–0.54 — readable over bars
      usePeak: Math.random() < 0.3,             // 30% get a brighter peak color
    })
  }
}

// Particles drawn ON TOP of everything (bars, rings, guides).
function drawParticles(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  p: TierPalette,
  t: number,
  energy: number,
) {
  ensureParticles()
  const dpr = window.devicePixelRatio || 1
  for (const part of _particles) {
    // y: derived purely from time — drifts upward, wraps seamlessly.
    const yNorm = 1 - ((t * part.vy + part.phase / (Math.PI * 2)) % 1)
    // Horizontal drift: two overlapping sine waves for organic wobble.
    const xNorm = part.baseX
      + Math.sin(t * 0.35 + part.phase)        * 0.040
      + Math.sin(t * 0.68 + part.phase * 1.9)  * 0.020
    // Twinkle: never drops below 50% so particles stay visible at all times.
    const twinkle = 0.50 + 0.50 * Math.sin(t * 1.6 + part.phase * 2.3)
    // Energy lifts brightness but particles are visible even with no music.
    const alpha = part.alpha * twinkle * (0.75 + energy * 0.50)
    const color = part.usePeak ? p.peak : p.top
    ctx.fillStyle = rgb(color, alpha)
    ctx.beginPath()
    ctx.arc(
      Math.max(0, Math.min(W, xNorm * W)),
      yNorm * H,
      part.size * dpr,
      0, Math.PI * 2,
    )
    ctx.fill()
  }
}

function draw() {
  rafId = requestAnimationFrame(draw)

  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = canvas.width
  const H = canvas.height
  const dark = true // always render in dark mode — bg is forced black
  const p = palette.value

  if (!analyser) {
    analyser = getSpaceAudioAnalyser()
    if (analyser) dataArray = new Uint8Array(analyser.frequencyBinCount)
  }

  ctx.clearRect(0, 0, W, H)

  const t = performance.now() / 1000

  // Compute per-frame energy values.
  let energy = 0
  let rawBass = 0
  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray)
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]!
    energy = sum / (dataArray.length * 255)

    const bassBinCount = Math.max(1, Math.floor(dataArray.length * BASS_BIN_FRACTION))
    let bassSum = 0
    for (let i = 0; i < bassBinCount; i++) bassSum += dataArray[i]!
    rawBass = bassSum / (bassBinCount * 255)
  }

  // Snappy bass (for kick flash).
  smoothedBass += (rawBass - smoothedBass) * BASS_SMOOTHING
  // Slow overall average (~1.3 s lag) — drives background brightness.
  slowAvgEnergy += (energy - slowAvgEnergy) * SLOW_AVG_SMOOTHING

  // Beat detection: fire a ring when bass spikes >35% above its own rolling mean.
  beatAvgBass += (rawBass - beatAvgBass) * BEAT_AVG_SMOOTHING
  if (
    rawBass > beatAvgBass * 1.35 &&
    rawBass > 0.10 &&
    t - lastBeatEmitTime > BEAT_MIN_INTERVAL_S &&
    beatRings.length < BEAT_RING_MAX
  ) {
    beatRings.push({ emitTime: t })
    lastBeatEmitTime = t
  }

  // Background layers — strictly before bars so nothing glows over them.
  drawBackground(ctx, W, H, p, dark, t, smoothedBass, slowAvgEnergy)

  // Beat-triggered rings — expand fast, fade out smoothly.
  const dprBeat = window.devicePixelRatio || 1
  const minDimBeat = Math.min(W, H)
  for (let i = beatRings.length - 1; i >= 0; i--) {
    const ring = beatRings[i]!
    const age = t - ring.emitTime
    if (age > BEAT_RING_DURATION_S) { beatRings.splice(i, 1); continue }
    const progress = age / BEAT_RING_DURATION_S
    // Ease-out expansion: fast at first, coasts to edge.
    const radius = Math.sqrt(progress) * minDimBeat * 0.62
    // Fade: bright at birth, gone by end.
    const alpha = (1 - progress) * (1 - progress) * 0.55
    ctx.strokeStyle = rgb(p.peak, alpha)
    ctx.lineWidth = Math.max(1, 2 * dprBeat * (1 - progress * 0.5))
    ctx.beginPath()
    ctx.arc(W / 2, H * 0.5, radius, 0, Math.PI * 2)  // centred in component
    ctx.stroke()
  }

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

  // dataArray was already filled above when computing energy.
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
    grad.addColorStop(0,   rgb(p.top,  0.70 + smooth * 0.30))
    grad.addColorStop(0.5, rgb(p.mid,  0.50 + smooth * 0.30))
    grad.addColorStop(1,   rgb(p.base, 0.25))

    ctx.fillStyle = grad
    ctx.beginPath()
    const r = Math.min(4, barW / 2)
    if (ctx.roundRect) {
      ctx.roundRect(x, y, barW, barH, [r, r, 0, 0])
    } else {
      ctx.rect(x, y, barW, barH)
    }
    ctx.fill()

    // Depth: left-edge highlight + right-edge shadow — gives bars a subtle 3-D feel.
    // Light source upper-right: shadow on left, highlight on right.
    const depthGrad = ctx.createLinearGradient(x, 0, x + barW, 0)
    depthGrad.addColorStop(0,    'rgba(0,0,0,0.28)')      // shadow
    depthGrad.addColorStop(0.18, 'rgba(0,0,0,0)')
    depthGrad.addColorStop(0.82, rgb(p.peak, 0))
    depthGrad.addColorStop(1,    rgb(p.peak, 0.22))       // highlight
    ctx.fillStyle = depthGrad
    ctx.beginPath()
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

  // Particles drawn last — on top of bars for the overlay texture effect.
  drawParticles(ctx, W, H, p, t, energy)
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
  smoothedBass = 0
  slowAvgEnergy = 0
  beatAvgBass = 0
  lastBeatEmitTime = -Infinity
  beatRings.length = 0
  _particles.length = 0
})
</script>
