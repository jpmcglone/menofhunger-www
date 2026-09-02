/**
 * Two-note descending hangup chime. Must stay in lockstep with iOS
 * `CallHangupPlayer` (784 Hz → 523 Hz, same attack/decay). Web Audio only — no asset.
 *
 * Note 1: G5 784 Hz at t=0.00s for 0.26s
 * Note 2: C5 523 Hz at t=0.20s for 0.40s
 */

export type HangupChime = {
  play: (sinkId?: string | null) => void
}

const NOTE_ONE_HZ = 784
const NOTE_TWO_HZ = 523
const NOTE_ONE_START = 0
const NOTE_TWO_START = 0.2
const NOTE_ONE_DUR = 0.26
const NOTE_TWO_DUR = 0.4
const ATTACK = 0.012
const PEAK = 0.16

export function createHangupChime(): HangupChime {
  let ctx: AudioContext | null = null

  function ensureCtx(): AudioContext | null {
    if (ctx) return ctx
    if (!import.meta.client) return null
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    try {
      ctx = new Ctor({ latencyHint: 'interactive' })
    } catch {
      return null
    }
    return ctx
  }

  function playNote(audio: AudioContext, freq: number, start: number, duration: number) {
    const osc = audio.createOscillator()
    const env = audio.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    const t0 = audio.currentTime + start
    env.gain.setValueAtTime(0, t0)
    env.gain.linearRampToValueAtTime(PEAK, t0 + ATTACK)
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
    osc.connect(env)
    env.connect(audio.destination)
    osc.start(t0)
    osc.stop(t0 + duration + 0.01)
    osc.onended = () => {
      try {
        osc.disconnect()
        env.disconnect()
      } catch {
        // ignore
      }
    }
  }

  return {
    play(sinkId?: string | null) {
      const audio = ensureCtx()
      if (!audio) return
      void audio.resume().catch(() => {})
      if (sinkId && 'setSinkId' in audio.destination) {
        void (audio.destination as AudioDestinationNode & { setSinkId?: (id: string) => Promise<void> }).setSinkId?.(sinkId).catch(() => {})
      }
      playNote(audio, NOTE_ONE_HZ, NOTE_ONE_START, NOTE_ONE_DUR)
      playNote(audio, NOTE_TWO_HZ, NOTE_TWO_START, NOTE_TWO_DUR)
    },
  }
}
