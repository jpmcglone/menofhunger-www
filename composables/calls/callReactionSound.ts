/**
 * Short two-tone blip for in-call reactions. Web Audio only — no asset.
 * Optional `sinkId` routes to the same speaker as the call.
 */

export type ReactionBlip = {
  play: (sinkId?: string | null) => void
}

export function createReactionBlip(): ReactionBlip {
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

  return {
    play(sinkId?: string | null) {
      const audio = ensureCtx()
      if (!audio) return
      void audio.resume().catch(() => {})
      if (sinkId && 'setSinkId' in audio.destination) {
        void (audio.destination as AudioDestinationNode & { setSinkId?: (id: string) => Promise<void> }).setSinkId?.(sinkId).catch(() => {})
      }
      const now = audio.currentTime
      const master = audio.createGain()
      master.gain.setValueAtTime(0, now)
      master.gain.linearRampToValueAtTime(0.12, now + 0.01)
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
      master.connect(audio.destination)
      const tones = [880, 1175]
      for (const [i, freq] of tones.entries()) {
        const osc = audio.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = freq
        osc.connect(master)
        osc.start(now + i * 0.04)
        osc.stop(now + 0.12 + i * 0.04)
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
          master.disconnect()
        } catch {
          // ignore
        }
      }, 220)
    },
  }
}
