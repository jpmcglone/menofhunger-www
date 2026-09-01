/**
 * Synthesized ring/ringback with Web Audio — no audio asset to ship or cache.
 * Incoming: classic two-tone (440 + 480 Hz) bursts. Outgoing: a softer single tone so the
 * caller hears "still ringing" without it sounding like their own phone.
 */

type RingtoneKind = 'incoming' | 'outgoing'

export type Ringtone = {
  start: () => void
  stop: () => void
}

const PATTERN: Record<RingtoneKind, { onMs: number; periodMs: number; freqs: number[]; gain: number }> = {
  incoming: { onMs: 1_500, periodMs: 4_000, freqs: [440, 480], gain: 0.16 },
  outgoing: { onMs: 1_000, periodMs: 3_500, freqs: [425], gain: 0.07 },
}

export function createRingtone(kind: RingtoneKind): Ringtone {
  let ctx: AudioContext | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let master: GainNode | null = null

  function burst() {
    if (!ctx || !master) return
    if (ctx.state !== 'running') {
      void ctx.resume().catch(() => {})
      return
    }
    const { onMs, freqs, gain } = PATTERN[kind]
    const now = ctx.currentTime
    const env = ctx.createGain()
    env.gain.setValueAtTime(0, now)
    env.gain.linearRampToValueAtTime(gain, now + 0.02)
    env.gain.setValueAtTime(gain, now + onMs / 1000 - 0.05)
    env.gain.linearRampToValueAtTime(0, now + onMs / 1000)
    env.connect(master)
    for (const f of freqs) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = f
      osc.connect(env)
      osc.start(now)
      osc.stop(now + onMs / 1000 + 0.01)
      osc.onended = () => {
        try {
          osc.disconnect()
        } catch {
          // ignore
        }
      }
    }
    setTimeout(() => {
      try {
        env.disconnect()
      } catch {
        // ignore
      }
    }, onMs + 100)
  }

  return {
    start() {
      if (!import.meta.client || timer) return
      const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      try {
        ctx = new Ctx({ latencyHint: 'interactive' })
      } catch {
        return
      }
      master = ctx.createGain()
      master.gain.value = 1
      master.connect(ctx.destination)
      // Autoplay policy: may stay suspended until the user has interacted with the page.
      void ctx.resume().catch(() => {})
      burst()
      timer = setInterval(burst, PATTERN[kind].periodMs)
    },
    stop() {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      const c = ctx
      ctx = null
      master = null
      if (c) void c.close().catch(() => {})
    },
  }
}
