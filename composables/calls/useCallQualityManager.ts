import {
  AUDIO_ONLY_TIER,
  isBadSample,
  nextQualityTier,
  QUALITY_WARMUP_MS,
  sampleFromStatsReport,
  topTierFor,
  VIDEO_QUALITY_TIERS,
  type QualityCounters,
} from './callQuality'

const SAMPLE_INTERVAL_MS = 2_000

type PeerQuality = {
  pc: RTCPeerConnection
  tier: number
  counters: QualityCounters
  /** When the connection last became `connected`; samples inside the warm-up window are ignored. */
  connectedAt: number | null
}

/**
 * Audio first: watches each peer connection's outgoing video every ~2s and steps the
 * encoder down (bitrate, framerate, resolution, then off) when the path degrades,
 * stepping back up slowly once it's clean. Never touches audio except to mark it
 * high priority.
 */
export class CallQualityManager {
  private readonly peers = new Map<string, PeerQuality>()
  private timer: ReturnType<typeof setInterval> | null = null
  private readonly onTierChange: (userId: string, tier: number) => void

  constructor(onTierChange: (userId: string, tier: number) => void) {
    this.onTierChange = onTierChange
  }

  attach(userId: string, pc: RTCPeerConnection): void {
    const top = topTierFor(this.peers.size + (this.peers.has(userId) ? 0 : 1))
    this.peers.set(userId, { pc, tier: top, counters: { bad: 0, good: 0 }, connectedAt: null })
    void this.applyTier(userId)
    this.reclampAll()
    this.ensureTimer()
  }

  detach(userId: string): void {
    this.peers.delete(userId)
    this.reclampAll()
    if (this.peers.size === 0) this.stopTimer()
  }

  /** Re-apply the current tier (e.g. after a video track was replaced and the sender got new parameters). */
  reapply(): void {
    for (const userId of this.peers.keys()) void this.applyTier(userId)
  }

  tierFor(userId: string): number {
    return this.peers.get(userId)?.tier ?? 0
  }

  /** Worst tier across peers: what the local user should be told about their connection. */
  worstTier(): number {
    let worst = 0
    for (const p of this.peers.values()) worst = Math.max(worst, p.tier)
    return worst
  }

  destroy(): void {
    this.stopTimer()
    this.peers.clear()
  }

  private ensureTimer(): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.sampleAll(), SAMPLE_INTERVAL_MS)
  }

  private stopTimer(): void {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  }

  /** When the mesh grows, the ceiling drops for everyone; when it shrinks, allow climbing back. */
  private reclampAll(): void {
    const top = topTierFor(this.peers.size)
    for (const [userId, p] of this.peers) {
      if (p.tier < top) {
        p.tier = top
        p.counters = { bad: 0, good: 0 }
        void this.applyTier(userId)
      }
    }
  }

  private async sampleAll(): Promise<void> {
    const top = topTierFor(this.peers.size)
    const now = Date.now()
    for (const [userId, p] of this.peers) {
      if (p.pc.connectionState !== 'connected') {
        p.connectedAt = null
        continue
      }
      if (p.connectedAt === null) p.connectedAt = now
      if (now - p.connectedAt < QUALITY_WARMUP_MS) continue
      let bad = false
      try {
        const report = await p.pc.getStats()
        const values: Record<string, unknown>[] = []
        report.forEach((v) => values.push(v as unknown as Record<string, unknown>))
        const cap = VIDEO_QUALITY_TIERS[Math.min(p.tier, AUDIO_ONLY_TIER)]?.maxBitrate ?? null
        bad = isBadSample(sampleFromStatsReport(values), cap)
      } catch {
        continue
      }
      const decision = nextQualityTier({ currentTier: p.tier, counters: p.counters, bad, topTier: top })
      p.counters = decision.counters
      if (decision.changed) {
        p.tier = decision.tier
        await this.applyTier(userId)
      }
    }
  }

  private async applyTier(userId: string): Promise<void> {
    const p = this.peers.get(userId)
    if (!p) return
    const tier = VIDEO_QUALITY_TIERS[Math.min(p.tier, AUDIO_ONLY_TIER)]!
    for (const sender of p.pc.getSenders()) {
      const kind = sender.track?.kind ?? kindFromTransceiver(p.pc, sender)
      if (kind !== 'video') continue
      try {
        const params = sender.getParameters()
        if (!params.encodings || params.encodings.length === 0) params.encodings = [{}]
        const enc = params.encodings[0]!
        enc.active = tier.active
        if (tier.active) {
          enc.maxBitrate = tier.maxBitrate
          enc.maxFramerate = tier.maxFramerate
          enc.scaleResolutionDownBy = tier.scaleResolutionDownBy
        }
        ;(params as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference = 'balanced'
        await sender.setParameters(params)
      } catch {
        // Older Safari rejects some parameters; the call still works at browser defaults.
      }
    }
    this.onTierChange(userId, p.tier)
  }
}

function kindFromTransceiver(pc: RTCPeerConnection, sender: RTCRtpSender): string | null {
  for (const t of pc.getTransceivers()) {
    if (t.sender === sender) return t.receiver.track?.kind ?? null
  }
  return null
}

/** Mark the audio sender as high priority so congestion control protects speech first. */
export async function prioritizeAudioSender(sender: RTCRtpSender): Promise<void> {
  try {
    const params = sender.getParameters()
    if (!params.encodings || params.encodings.length === 0) params.encodings = [{}]
    const enc = params.encodings[0] as RTCRtpEncodingParameters & { priority?: string; networkPriority?: string }
    enc.priority = 'high'
    enc.networkPriority = 'high'
    await sender.setParameters(params)
  } catch {
    // Not supported everywhere; harmless.
  }
}
