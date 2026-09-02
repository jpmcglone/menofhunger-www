/**
 * "Who's talking" detection for call tiles.
 *
 * Levels come from a Web Audio `AnalyserNode` per stream (RMS of the time-domain signal, 0..1).
 * The flip to/from "speaking" uses hysteresis so a ring doesn't flicker on every syllable gap:
 * enter above `SPEAKING_ENTER`, leave only once the level has stayed below `SPEAKING_EXIT`
 * for `SPEAKING_HOLD_MS`. iOS mirrors the same constants against libwebrtc's `audioLevel`.
 */

/** RMS above this while quiet → speaking. Typical room noise sits around 0.002–0.008. */
export const SPEAKING_ENTER = 0.02
/** RMS below this (sustained) while speaking → quiet. Lower than ENTER on purpose. */
export const SPEAKING_EXIT = 0.01
/** How long the level must stay under EXIT before the ring drops. Covers natural pauses. */
export const SPEAKING_HOLD_MS = 350
/** Sampling cadence. 10 Hz is plenty for a UI ring and cheap enough for 4 analysers. */
export const SPEAKING_POLL_MS = 100
/** RMS / webrtc `audioLevel` that maps to ring intensity 1. Typical speech sits below this. */
export const SPEAKING_FULL = 0.16

export type SpeakingTrack = {
  speaking: boolean
  /** Last time the level was above the relevant threshold (ms). */
  lastLoudAt: number
}

export const INITIAL_SPEAKING: SpeakingTrack = { speaking: false, lastLoudAt: 0 }

/** Pure hysteresis step. Returns the same object when nothing changed so callers can `===`. */
export function reduceSpeaking(prev: SpeakingTrack, level: number, now: number): SpeakingTrack {
  if (!prev.speaking) {
    return level >= SPEAKING_ENTER ? { speaking: true, lastLoudAt: now } : prev
  }
  if (level >= SPEAKING_EXIT) {
    return prev.lastLoudAt === now ? prev : { speaking: true, lastLoudAt: now }
  }
  return now - prev.lastLoudAt >= SPEAKING_HOLD_MS ? { speaking: false, lastLoudAt: prev.lastLoudAt } : prev
}

/** Map a raw analyser / webrtc level onto 0…1 once hysteresis says they're speaking. */
export function speakingIntensity(level: number, speaking: boolean): number {
  if (!speaking) return 0
  const span = SPEAKING_FULL - SPEAKING_EXIT
  if (span <= 0) return 0
  return Math.min(1, Math.max(0, (level - SPEAKING_EXIT) / span))
}

export function quantizeSpeakingIntensity(intensity: number): number {
  if (intensity <= 0) return 0
  return Math.round(intensity * 20) / 20
}

/** Per-ring opacities: 1 always follows intensity, 2 from ~⅓, 3 from ~⅔. */
export function speakingRingAlphas(intensity: number): [number, number, number] {
  const i = Math.min(1, Math.max(0, intensity))
  return [i, Math.min(1, Math.max(0, (i - 0.33) / 0.45)), Math.min(1, Math.max(0, (i - 0.66) / 0.34))]
}

/** RMS of an analyser's float time-domain buffer. */
export function rmsLevel(samples: Float32Array): number {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i]!
    sum += v * v
  }
  return Math.sqrt(sum / samples.length)
}

type Tap = {
  stream: MediaStream
  source: MediaStreamAudioSourceNode
  analyser: AnalyserNode
  buffer: Float32Array<ArrayBuffer>
  track: SpeakingTrack
  level: number
}

/**
 * One `AudioContext`, one analyser per stream. Analysers are pure taps: nothing is routed to
 * `destination`, so this never doubles up audio playback. Remote streams still play through
 * `CallAudioSink`; the local mic is never played back at all.
 */
export class SpeakingMonitor {
  private ctx: AudioContext | null = null
  private taps = new Map<string, Tap>()
  private muted = new Set<string>()
  private timer: ReturnType<typeof setInterval> | null = null
  private snapshot: Record<string, number> = {}

  constructor(private readonly onChange: (levels: Record<string, number>) => void) {}

  /** Attach (or replace) the stream analysed under `id`; `null` detaches. */
  setStream(id: string, stream: MediaStream | null): void {
    const existing = this.taps.get(id)
    if (existing?.stream === stream) return
    if (existing) this.detach(id)
    if (!stream || stream.getAudioTracks().length === 0) {
      this.publish()
      return
    }
    const ctx = this.context()
    if (!ctx) return
    try {
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.4
      source.connect(analyser)
      const buffer = new Float32Array(new ArrayBuffer(analyser.fftSize * Float32Array.BYTES_PER_ELEMENT))
      this.taps.set(id, { stream, source, analyser, buffer, track: INITIAL_SPEAKING, level: 0 })
    } catch {
      // Stream not analysable in this browser (e.g. no live audio track yet); stay silent.
      return
    }
    this.ensureTimer()
  }

  /** A muted participant is never "speaking", whatever the analyser picks up. */
  setMuted(id: string, muted: boolean): void {
    if (muted) this.muted.add(id)
    else this.muted.delete(id)
    this.publish()
  }

  destroy(): void {
    for (const id of [...this.taps.keys()]) this.detach(id)
    this.muted.clear()
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    void this.ctx?.close().catch(() => {})
    this.ctx = null
    this.snapshot = {}
    this.onChange({})
  }

  private context(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {})
      return this.ctx
    }
    if (typeof AudioContext === 'undefined') return null
    try {
      this.ctx = new AudioContext()
    } catch {
      return null
    }
    return this.ctx
  }

  private detach(id: string): void {
    const tap = this.taps.get(id)
    if (!tap) return
    try {
      tap.source.disconnect()
      tap.analyser.disconnect()
    } catch {
      // Already torn down with the context.
    }
    this.taps.delete(id)
    if (this.taps.size === 0 && this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private ensureTimer(): void {
    if (this.timer) return
    this.timer = setInterval(() => this.tick(), SPEAKING_POLL_MS)
  }

  private tick(): void {
    const now = Date.now()
    for (const tap of this.taps.values()) {
      tap.analyser.getFloatTimeDomainData(tap.buffer)
      tap.level = rmsLevel(tap.buffer)
      tap.track = reduceSpeaking(tap.track, tap.level, now)
    }
    this.publish()
  }

  private publish(): void {
    const next: Record<string, number> = {}
    for (const [id, tap] of this.taps) {
      if (this.muted.has(id)) continue
      const quantized = quantizeSpeakingIntensity(speakingIntensity(tap.level, tap.track.speaking))
      if (quantized > 0) next[id] = quantized
    }
    const prevKeys = Object.keys(this.snapshot)
    const nextKeys = Object.keys(next)
    if (
      prevKeys.length === nextKeys.length
      && nextKeys.every((k) => this.snapshot[k] === next[k])
    ) return
    this.snapshot = next
    this.onChange(next)
  }
}
