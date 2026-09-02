import type { WsRtcSignalPayload } from '~/types/api'
import { CALL_DATA_CHANNEL_LABEL } from '../callReactions'
import { CallQualityManager, prioritizeAudioSender } from '../useCallQualityManager'
import type { CallSignal, CallTransport, CallTransportOptions, PeerMediaState } from './CallTransport'

/** How long `disconnected` may last before we force an ICE restart. */
const DISCONNECTED_RESTART_MS = 3_000
/** Signals buffered per not-yet-known peer (their offer can beat our `calls:updated`). */
const MAX_EARLY_SIGNALS = 64
/** Fallback when the ack didn't carry `reconnectGraceMs` (matches the server constant). */
export const DEFAULT_RECONNECT_GRACE_MS = 30_000

type Peer = {
  userId: string
  pc: RTCPeerConnection
  stream: MediaStream
  audioSender: RTCRtpSender
  videoSender: RTCRtpSender
  /** Perfect negotiation: the polite side rolls back on collision. */
  polite: boolean
  makingOffer: boolean
  ignoreOffer: boolean
  isSettingRemoteAnswerPending: boolean
  pendingCandidates: RTCIceCandidateInit[]
  disconnectedTimer: ReturnType<typeof setTimeout> | null
  /** Runs while `reconnecting`; on expiry the peer is `failed` and no more restarts are attempted. */
  giveUpTimer: ReturnType<typeof setTimeout> | null
  state: PeerMediaState
  dataChannel: RTCDataChannel | null
}

/**
 * Browser-to-browser mesh: one RTCPeerConnection per remote participant, both
 * audio and video transceivers created up front (so negotiation happens even before
 * a local track exists, and toggling camera is a `replaceTrack`, not a renegotiation).
 *
 * Signaling follows the W3C "perfect negotiation" pattern verbatim; `polite` is
 * decided deterministically by user id so both sides always agree.
 */
export class PeerToPeerCallTransport implements CallTransport {
  private readonly peers = new Map<string, Peer>()
  /**
   * The joining side builds its connection from the join ack while we only learn about
   * them from `calls:updated`; their first offer/candidates can land first. Hold them
   * until `setPeers` adds the peer, then replay in order.
   */
  private readonly earlySignals = new Map<string, WsRtcSignalPayload[]>()
  private readonly opts: CallTransportOptions
  private readonly quality: CallQualityManager
  private localAudio: MediaStreamTrack | null = null
  private localVideo: MediaStreamTrack | null = null
  private destroyed = false

  constructor(opts: CallTransportOptions, onTierChange: (userId: string, tier: number) => void = () => {}) {
    this.opts = opts
    this.quality = new CallQualityManager(onTierChange)
  }

  get qualityManager(): CallQualityManager {
    return this.quality
  }

  setPeers(userIds: string[]): void {
    if (this.destroyed) return
    const wanted = new Set(userIds.filter((id) => id && id !== this.opts.selfUserId))
    for (const id of [...this.peers.keys()]) {
      if (!wanted.has(id)) this.removePeer(id)
    }
    for (const id of wanted) {
      if (!this.peers.has(id)) {
        this.addPeer(id)
        const queued = this.earlySignals.get(id)
        this.earlySignals.delete(id)
        if (queued) void this.replay(queued)
      }
    }
  }

  private async replay(signals: WsRtcSignalPayload[]): Promise<void> {
    for (const s of signals) await this.handleSignal(s)
  }

  peerCount(): number {
    return this.peers.size
  }

  restartIce(): void {
    if (this.destroyed) return
    for (const peer of this.peers.values()) {
      if (peer.state === 'connected' || peer.state === 'failed') continue
      this.restartIcePeer(peer)
    }
  }

  resumeConnections(): void {
    if (this.destroyed) return
    for (const [id, peer] of [...this.peers.entries()]) {
      if (peer.state === 'failed') {
        this.removePeer(id)
        this.addPeer(id)
        continue
      }
      this.restartIcePeer(peer)
    }
  }

  async setLocalTrack(kind: 'audio' | 'video', track: MediaStreamTrack | null): Promise<void> {
    if (kind === 'audio') this.localAudio = track
    else this.localVideo = track
    await Promise.all(
      [...this.peers.values()].map(async (peer) => {
        const sender = kind === 'audio' ? peer.audioSender : peer.videoSender
        try {
          await sender.replaceTrack(track)
        } catch {
          // Sender may be closed mid-teardown.
        }
      }),
    )
    if (kind === 'video' && track) this.quality.reapply()
  }

  sendData(payload: unknown): void {
    if (this.destroyed) return
    let body: string
    try {
      body = JSON.stringify(payload)
    } catch {
      return
    }
    for (const peer of this.peers.values()) {
      const ch = peer.dataChannel
      if (!ch || ch.readyState !== 'open') continue
      try {
        ch.send(body)
      } catch {
        // Channel closed mid-send.
      }
    }
  }

  async handleSignal(payload: WsRtcSignalPayload): Promise<void> {
    if (this.destroyed || payload.callId !== this.opts.callId) return
    const peer = this.peers.get(payload.fromUserId)
    if (!peer) {
      const queue = this.earlySignals.get(payload.fromUserId) ?? []
      if (queue.length < MAX_EARLY_SIGNALS) queue.push(payload)
      this.earlySignals.set(payload.fromUserId, queue)
      return
    }
    const { pc } = peer

    try {
      if (payload.description) {
        const description = payload.description as RTCSessionDescriptionInit
        const readyForOffer = !peer.makingOffer && (pc.signalingState === 'stable' || peer.isSettingRemoteAnswerPending)
        const offerCollision = description.type === 'offer' && !readyForOffer

        peer.ignoreOffer = !peer.polite && offerCollision
        if (peer.ignoreOffer) return

        peer.isSettingRemoteAnswerPending = description.type === 'answer'
        await pc.setRemoteDescription(description)
        peer.isSettingRemoteAnswerPending = false

        // Candidates that arrived before the remote description can now be applied.
        const queued = peer.pendingCandidates.splice(0)
        for (const c of queued) {
          try {
            await pc.addIceCandidate(c)
          } catch {
            // Stale candidate from a previous negotiation; ignore.
          }
        }

        if (description.type === 'offer') {
          await pc.setLocalDescription()
          this.send(peer.userId, { description: toDescriptionDto(pc.localDescription) })
        }
      } else if (payload.candidate) {
        const candidate = payload.candidate as RTCIceCandidateInit
        if (!pc.remoteDescription) {
          peer.pendingCandidates.push(candidate)
          return
        }
        try {
          await pc.addIceCandidate(candidate)
        } catch (err) {
          if (!peer.ignoreOffer) throw err
        }
      }
    } catch {
      // Negotiation glitches are recovered by the next negotiationneeded / ICE restart.
    }
  }

  destroy(): void {
    this.destroyed = true
    for (const id of [...this.peers.keys()]) this.removePeer(id)
    this.earlySignals.clear()
    this.quality.destroy()
  }

  // ─── Internals ──────────────────────────────────────────────────────────────

  private addPeer(userId: string): void {
    const pc = new RTCPeerConnection({
      iceServers: this.opts.iceServers.map((s) => ({ urls: s.urls, username: s.username, credential: s.credential })),
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    })
    const stream = new MediaStream()
    const audioTransceiver = pc.addTransceiver('audio', { direction: 'sendrecv' })
    const videoTransceiver = pc.addTransceiver('video', { direction: 'sendrecv' })

    const peer: Peer = {
      userId,
      pc,
      stream,
      audioSender: audioTransceiver.sender,
      videoSender: videoTransceiver.sender,
      polite: this.opts.selfUserId < userId,
      makingOffer: false,
      ignoreOffer: false,
      isSettingRemoteAnswerPending: false,
      pendingCandidates: [],
      disconnectedTimer: null,
      giveUpTimer: null,
      state: 'connecting',
      dataChannel: null,
    }
    this.peers.set(userId, peer)

    // Impolite side creates the channel so it rides the first offer; polite receives `ondatachannel`.
    if (!peer.polite) {
      this.bindDataChannel(peer, pc.createDataChannel(CALL_DATA_CHANNEL_LABEL, { ordered: true }))
    }
    pc.ondatachannel = (ev) => {
      if (ev.channel?.label === CALL_DATA_CHANNEL_LABEL) this.bindDataChannel(peer, ev.channel)
    }

    if (this.localAudio) void audioTransceiver.sender.replaceTrack(this.localAudio)
    if (this.localVideo) void videoTransceiver.sender.replaceTrack(this.localVideo)
    void prioritizeAudioSender(audioTransceiver.sender)

    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true
        await pc.setLocalDescription()
        this.send(userId, { description: toDescriptionDto(pc.localDescription) })
      } catch {
        // Retried on the next state change.
      } finally {
        peer.makingOffer = false
      }
    }

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return
      this.send(userId, {
        candidate: {
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
          usernameFragment: candidate.usernameFragment,
        },
      })
    }

    pc.ontrack = ({ track }) => {
      if (peer.stream.getTracks().some((t) => t.id === track.id)) return
      // A fresh MediaStream, not `addTrack` on the old one: programmatic `addTrack` fires no
      // `addtrack` event and keeps the object identity, so Vue watchers on the stream would
      // never re-run and the bound <video> would sit on the avatar until it remounted.
      peer.stream = new MediaStream([...peer.stream.getTracks(), track])
      this.opts.events.onRemoteStream(userId, peer.stream)
    }

    pc.oniceconnectionstatechange = () => {
      const s = pc.iceConnectionState
      if (peer.state === 'failed') return
      if (s === 'failed') {
        this.setPeerState(peer, 'reconnecting')
        this.restartIcePeer(peer)
      } else if (s === 'disconnected') {
        this.setPeerState(peer, 'reconnecting')
        this.clearDisconnectedTimer(peer)
        peer.disconnectedTimer = setTimeout(() => {
          peer.disconnectedTimer = null
          if (pc.iceConnectionState === 'disconnected') this.restartIcePeer(peer)
        }, DISCONNECTED_RESTART_MS)
      } else if (s === 'connected' || s === 'completed') {
        this.clearDisconnectedTimer(peer)
        this.setPeerState(peer, 'connected')
      }
    }

    pc.onconnectionstatechange = () => {
      const s = pc.connectionState
      if (peer.state === 'failed') return
      if (s === 'connected') this.setPeerState(peer, 'connected')
      else if (s === 'failed') {
        this.setPeerState(peer, 'reconnecting')
        this.restartIcePeer(peer)
      } else if (s === 'closed') this.setPeerState(peer, 'failed')
    }

    this.quality.attach(userId, pc)
    this.opts.events.onRemoteStream(userId, stream)
    this.opts.events.onPeerState(userId, 'connecting')
  }

  private removePeer(userId: string): void {
    const peer = this.peers.get(userId)
    if (!peer) return
    this.peers.delete(userId)
    this.clearDisconnectedTimer(peer)
    this.clearGiveUpTimer(peer)
    this.quality.detach(userId)
    try {
      peer.pc.onnegotiationneeded = null
      peer.pc.onicecandidate = null
      peer.pc.ontrack = null
      peer.pc.ondatachannel = null
      peer.pc.oniceconnectionstatechange = null
      peer.pc.onconnectionstatechange = null
      if (peer.dataChannel) {
        peer.dataChannel.onmessage = null
        peer.dataChannel.onopen = null
        peer.dataChannel.close()
        peer.dataChannel = null
      }
      peer.pc.close()
    } catch {
      // Already closed.
    }
    for (const t of peer.stream.getTracks()) peer.stream.removeTrack(t)
    this.opts.events.onRemoteStream(userId, null)
  }

  private restartIcePeer(peer: Peer): void {
    // Only one side needs to restart; the impolite side does it so both don't race.
    if (peer.polite || peer.state === 'failed') return
    try {
      peer.pc.restartIce()
    } catch {
      // Not supported (very old browsers): nothing more we can do without a reload.
    }
  }

  private setPeerState(peer: Peer, state: PeerMediaState): void {
    if (peer.state === state) return
    peer.state = state
    if (state === 'reconnecting') this.armGiveUpTimer(peer)
    else this.clearGiveUpTimer(peer)
    this.opts.events.onPeerState(peer.userId, state)
  }

  /**
   * Mirror of the server's participant grace: if the media path hasn't recovered by the time
   * the server would have dropped a disconnected participant, stop pretending and let the
   * session decide (show "Connection lost", or wait for `calls:updated` to remove them).
   */
  private armGiveUpTimer(peer: Peer): void {
    if (peer.giveUpTimer) return
    const ms = this.opts.reconnectGraceMs ?? DEFAULT_RECONNECT_GRACE_MS
    peer.giveUpTimer = setTimeout(() => {
      peer.giveUpTimer = null
      if (peer.state === 'reconnecting') {
        this.clearDisconnectedTimer(peer)
        this.setPeerState(peer, 'failed')
      }
    }, ms)
  }

  private clearGiveUpTimer(peer: Peer): void {
    if (!peer.giveUpTimer) return
    clearTimeout(peer.giveUpTimer)
    peer.giveUpTimer = null
  }

  private clearDisconnectedTimer(peer: Peer): void {
    if (!peer.disconnectedTimer) return
    clearTimeout(peer.disconnectedTimer)
    peer.disconnectedTimer = null
  }

  private bindDataChannel(peer: Peer, channel: RTCDataChannel): void {
    peer.dataChannel = channel
    channel.onmessage = (ev) => {
      let parsed: unknown = ev.data
      if (typeof ev.data === 'string') {
        try {
          parsed = JSON.parse(ev.data)
        } catch {
          return
        }
      }
      this.opts.events.onData?.(peer.userId, parsed)
    }
  }

  private send(toUserId: string, signal: CallSignal): void {
    if (this.destroyed) return
    this.opts.sendSignal(toUserId, signal)
  }
}

function toDescriptionDto(d: RTCSessionDescription | null): { type: string; sdp?: string } {
  return { type: d?.type ?? 'offer', sdp: d?.sdp ?? '' }
}
