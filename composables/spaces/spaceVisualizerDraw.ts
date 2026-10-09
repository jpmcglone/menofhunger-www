import { spaceVisualizerRgb, type SpaceVisualizerPalette } from './spaceVisualizerPalette'

// ─── Background ──────────────────────────────────────────────────────────────
const RING_COUNT = 3
const RING_CYCLE_S = 5

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  p: SpaceVisualizerPalette,
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
  glowGrad.addColorStop(0.00, spaceVisualizerRgb(p.mid,  coreAlpha))
  glowGrad.addColorStop(0.20, spaceVisualizerRgb(p.mid,  midAlpha))
  glowGrad.addColorStop(0.45, spaceVisualizerRgb(p.base, rimAlpha))
  glowGrad.addColorStop(0.70, spaceVisualizerRgb(p.base, rimAlpha * 0.4))
  glowGrad.addColorStop(1.00, spaceVisualizerRgb(p.base, 0))
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 0, W, H)

  // Dot grid — readable but not distracting.
  const GRID = Math.round(28 * dpr)
  const DOT_R = Math.max(1, dpr)
  ctx.fillStyle = spaceVisualizerRgb(p.idle, 0.11)
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
    ctx.strokeStyle = spaceVisualizerRgb(p.top, alpha)
    ctx.lineWidth = Math.max(1.5, 1.5 * dpr)
    ctx.beginPath()
    ctx.arc(cx, H * 0.5, radius, 0, Math.PI * 2)
    ctx.stroke()
  }
}

export function drawIdleLine(ctx: CanvasRenderingContext2D, W: number, H: number, p: SpaceVisualizerPalette, dark: boolean) {
  const y = H - 2
  const alpha = dark ? 0.22 : 0.15
  const grad = ctx.createLinearGradient(0, 0, W, 0)
  grad.addColorStop(0,   spaceVisualizerRgb(p.idle, 0))
  grad.addColorStop(0.2, spaceVisualizerRgb(p.idle, alpha))
  grad.addColorStop(0.8, spaceVisualizerRgb(p.idle, alpha))
  grad.addColorStop(1,   spaceVisualizerRgb(p.idle, 0))
  ctx.fillStyle = grad
  ctx.fillRect(0, y, W, 2)
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

/** Per-instance drifting dust field, drawn on top of everything (bars, rings, guides). */
export function createSpaceParticleField() {
  const particles: Particle[] = []

  function ensure() {
    if (particles.length === PARTICLE_COUNT) return
    particles.length = 0
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        baseX:   Math.random(),
        vy:      0.055 + Math.random() * 0.085,  // full-height drift: ~7–18 s (visible movement)
        phase:   Math.random() * Math.PI * 2,
        size:    0.35 + Math.random() * 0.55,     // 0.35–0.9 CSS px — dust/grain, not blobs
        alpha:   0.22 + Math.random() * 0.32,     // 0.22–0.54 — readable over bars
        usePeak: Math.random() < 0.3,             // 30% get a brighter peak color
      })
    }
  }

  function draw(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    p: SpaceVisualizerPalette,
    t: number,
    energy: number,
  ) {
    ensure()
    const dpr = window.devicePixelRatio || 1
    for (const part of particles) {
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
      ctx.fillStyle = spaceVisualizerRgb(color, alpha)
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

  function reset() {
    particles.length = 0
  }

  return { draw, reset }
}

export interface BeatRing { emitTime: number }
export const BEAT_RING_DURATION_S = 1.1

/** Beat-triggered rings — expand fast, fade out smoothly; expired rings are removed in place. */
export function drawBeatRings(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  p: SpaceVisualizerPalette,
  t: number,
  beatRings: BeatRing[],
) {
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
    ctx.strokeStyle = spaceVisualizerRgb(p.peak, alpha)
    ctx.lineWidth = Math.max(1, 2 * dprBeat * (1 - progress * 0.5))
    ctx.beginPath()
    ctx.arc(W / 2, H * 0.5, radius, 0, Math.PI * 2)  // centred in component
    ctx.stroke()
  }
}

/** Subtle horizontal guide lines (tone adapts to mode). */
export function drawGuideLines(ctx: CanvasRenderingContext2D, W: number, H: number, dark: boolean) {
  ctx.strokeStyle = dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'
  ctx.lineWidth = 1
  for (let y = H * 0.25; y < H; y += H * 0.25) {
    ctx.beginPath()
    ctx.moveTo(0, Math.round(y))
    ctx.lineTo(W, Math.round(y))
    ctx.stroke()
  }
}
