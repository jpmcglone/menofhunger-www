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
          class="absolute top-3 left-3 pointer-events-none select-none"
        >
          <AppSpaceStatusBadge kind="live" class="!bg-black/40 !text-green-400 backdrop-blur-sm !px-2.5 !py-1 !text-[10px] !tracking-widest" />
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
import { getSpaceAudioAnalyser, resumeSpaceAudioContext, debugSpaceAudio } from '~/composables/useSpaceAudio'
import { SPACE_VISUALIZER_PALETTES, spaceVisualizerRgb } from '~/composables/spaces/spaceVisualizerPalette'
import { createSpaceParticleField, drawBackground, drawBeatRings, drawGuideLines, drawIdleLine, type BeatRing } from '~/composables/spaces/spaceVisualizerDraw'
import { userColorTier, type UserColorTier } from '~/utils/user-tier'

const props = withDefaults(
  defineProps<{ backgroundOnly?: boolean }>(),
  { backgroundOnly: false },
)

const { isPlaying, toggle, isBuffering } = useSpaceAudio()
const { user } = useAuth()

const tier = computed<UserColorTier>(() => userColorTier(user.value))

const palette = computed(() => {
  const p = SPACE_VISUALIZER_PALETTES[tier.value]
  return {
    ...p,
    cssTop: spaceVisualizerRgb(p.top),
    cssMid: spaceVisualizerRgb(p.mid),
  }
})

// ─── Canvas / RAF ────────────────────────────────────────────────────────────
const canvasEl = ref<HTMLCanvasElement | null>(null)

let rafId: number | null = null
let analyser: AnalyserNode | null = null
let dataArray: Uint8Array<ArrayBuffer> | null = null
let lastResumeAttemptMs = -Infinity
// Consecutive frames where energy was zero while audio was playing.
// Used to log a diagnostic warning once to the console.
let zeroEnergyFrames = 0
let zeroEnergyWarningLogged = false

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
const beatRings: BeatRing[] = []
const BEAT_RING_MAX = 6

let ro: ResizeObserver | null = null
const particleField = createSpaceParticleField()

// Pending canvas size set by ResizeObserver; applied at the top of draw() so
// the canvas is cleared and immediately redrawn in the same RAF frame (no blank-frame flicker).
let pendingCanvasSize: { w: number; h: number } | null = null

function setupCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
}

function scheduleCanvasResize(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  pendingCanvasSize = { w: Math.round(rect.width * dpr), h: Math.round(rect.height * dpr) }
}

function draw() {
  rafId = requestAnimationFrame(draw)

  const canvas = canvasEl.value
  if (!canvas) return

  // Apply any pending resize before acquiring ctx dimensions.
  // Doing it here (inside the RAF callback) means the canvas is cleared and
  // immediately redrawn in the same frame — no blank-frame flicker on resize.
  if (pendingCanvasSize) {
    canvas.width = pendingCanvasSize.w
    canvas.height = pendingCanvasSize.h
    pendingCanvasSize = null
  }

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

  // If the analyser is wired up but the AudioContext got suspended (iOS Safari
  // re-suspends aggressively), nudge it awake — but only once per second so we
  // aren't firing 60 redundant promises per frame when the context is running.
  if (analyser) {
    const nowMs = performance.now()
    if (nowMs - lastResumeAttemptMs > 1000) {
      lastResumeAttemptMs = nowMs
      resumeSpaceAudioContext()
    }
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

    // If we're playing audio but consistently getting zero energy, log a
    // diagnostic once so it shows up in Safari's Web Inspector console.
    if (isPlaying.value) {
      if (energy === 0) {
        zeroEnergyFrames++
        if (zeroEnergyFrames === 120 && !zeroEnergyWarningLogged) {
          zeroEnergyWarningLogged = true
          console.warn(
            '[SpaceVisualizer] Audio is playing but getByteFrequencyData returns all zeros.',
            'Possible causes: (1) AudioContext is suspended — check audioCtx.state,',
            '(2) createMediaElementSource failed (CORS) — check for earlier [SpaceAudio] errors,',
            '(3) audio is being decoded via a hardware path bypassing Web Audio.',
            'Run debugSpaceAudio() in the console for a full diagnostic.',
          )
          debugSpaceAudio()
        }
      } else {
        zeroEnergyFrames = 0
        zeroEnergyWarningLogged = false
      }
    }

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

  drawBeatRings(ctx, W, H, p, t, beatRings)
  drawGuideLines(ctx, W, H, dark)

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
    grad.addColorStop(0,   spaceVisualizerRgb(p.top,  0.70 + smooth * 0.30))
    grad.addColorStop(0.5, spaceVisualizerRgb(p.mid,  0.50 + smooth * 0.30))
    grad.addColorStop(1,   spaceVisualizerRgb(p.base, 0.25))

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
    depthGrad.addColorStop(0.82, spaceVisualizerRgb(p.peak, 0))
    depthGrad.addColorStop(1,    spaceVisualizerRgb(p.peak, 0.22))       // highlight
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
    reflGrad.addColorStop(0, spaceVisualizerRgb(p.top, 0.10 + smooth * 0.06))
    reflGrad.addColorStop(1, spaceVisualizerRgb(p.top, 0))
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
      ctx.fillStyle = spaceVisualizerRgb(p.peak, alpha * 0.9)
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
  particleField.draw(ctx, W, H, p, t, energy)
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
    if (canvasEl.value) scheduleCanvasResize(canvasEl.value)
  })
  ro.observe(canvas)

  startLoop()
})

onBeforeUnmount(() => {
  stopLoop()
  ro?.disconnect()
  ro = null
  pendingCanvasSize = null
  peaks = new Float32Array(BAR_COUNT)
  peakHoldFrames = new Uint8Array(BAR_COUNT)
  smoothedBars = new Float32Array(BAR_COUNT)
  smoothedBass = 0
  slowAvgEnergy = 0
  beatAvgBass = 0
  lastBeatEmitTime = -Infinity
  lastResumeAttemptMs = -Infinity
  zeroEnergyFrames = 0
  zeroEnergyWarningLogged = false
  beatRings.length = 0
  particleField.reset()
})
</script>
