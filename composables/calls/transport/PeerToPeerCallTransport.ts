import type { WsRtcSignalPayload } from '~/types/api'
import { CALL_DATA_CHANNEL_LABEL } from '../callReactions'
import { CallQualityManager, prioritizeAudioSender } from '../useCallQualityManager'
import type { CallLocalTrackKind, CallSignal, CallTransport, CallTransportOptions, PeerMediaState } from './CallTransport'

/** How long `disconnected` may last before we force an ICE restart. */
const DISCONNECTED_RESTART_MS = 3_000
/** Still `connecting` with no pair: re-offer (or ICE-restart) instead of spinning forever. */
export const CONNECTING_RESTART_MS = 8_000
/** Signals buffered per not-yet-known peer (their offer can beat our `calls:updated`). */
const MAX_EARLY_SIGNALS = 64
/** Fallback when the ack didn't carry `reconnectGraceMs` (matches the server constant). */
export const DEFAULT_RECONNECT_GRACE_MS = 30_000

type Peer = {
  userId: string
  pc: RTCPeerConnection
  stream: MediaStream
  screenStream: MediaStream | null
  audioSender: RTCRtpSender
  videoSender: RTCRtpSender
  screenSender: RTCRtpSender | null
  screenTransceiver: RTCRtpTransceiver | null
  /** Perfect negotiation: the polite side rolls back on collision. */
  polite: boolean
  makingOffer: boolean
  ignoreOffer: boolean
  isSettingRemoteAnswerPending: boolean
  pendingCandidates: RTCIceCandidateInit[]
  disconnectedTimer: ReturnType<typeof setTimeout> | null
  connectingTimer: ReturnType<typeof setTimeout> | null
  /** Runs while `reconnecting`; on expiry the peer is `failed` and no more restarts are attempted. */
  giveUpTimer: ReturnType<typeof setTimeout> | null
  state: PeerMediaState
  dataChannel: RTCDataChannel | null
  /**
   * Hold `negotiationneeded` until early signals (their offer) are applied. Otherwise we
   * glare: we send an offer while they already sent one, and the impolite side drops theirs.
   */
  holdNegotiate: boolean
  /** Serialize setLocal/setRemote/addIceCandidate — concurrent applies break Chrome↔libwebrtc. */
  queue: Promise<void>
}

/**
 * Browser-to-browser mesh: one RTCPeerConnection per remote participant.
 * Audio + camera transceivers are created up front so negotiation happens before
 * a local track exists. The screen m-line is added only when someone shares —
 * a third transceiver on day one glares with iOS builds that still offer two.
 *
 * Signaling follows the W3C "perfect negotiation" pattern; `polite` is decided
 * by user id so both sides always agree. The polite side explicitly rolls back
 * on glare (Safari / libwebrtc do not implicit-rollback like Chromium).
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
  private localScreen: MediaStreamTrack | null = null
  private destroyed = false

  constructor(opts: CallTransportOptions, onTierChange: (userId: string, tier: number) => void = () => {}) {
    this.opts = opts
    this.quality = new CallQualityManager(onTierChange, (userId, path) => this.opts.events.onIcePath?.(userId, path))
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
        void this.releasePeer(id, queued)
      }
    }
  }

  private async releasePeer(userId: string, queued?: WsRtcSignalPayload[]): Promise<void> {
    if (queued?.length) await this.replay(queued)
    const peer = this.peers.get(userId)
    if (!peer || this.destroyed) return
    peer.holdNegotiate = false
    if (!peer.pc.remoteDescription) await this.makeOffer(peer)
  }

  private async makeOffer(peer: Peer): Promise<void> {
    if (peer.holdNegotiate || this.destroyed) return
    await this.enqueue(peer, async () => {
      if (peer.holdNegotiate || this.destroyed) return
      try {
        peer.makingOffer = true
        await peer.pc.setLocalDescription()
        this.send(peer.userId, { description: toDescriptionDto(peer.pc.localDescription) })
      } catch {
        // Retried on the next state change.
      } finally {
        peer.makingOffer = false
      }
    })
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

  async setLocalTrack(kind: CallLocalTrackKind, track: MediaStreamTrack | null): Promise<void> {
    if (kind === 'audio') this.localAudio = track
    else if (kind === 'video') this.localVideo = track
    else this.localScreen = track
    await Promise.all(
      [...this.peers.values()].map(async (peer) => {
        const sender =
          kind === 'audio'
            ? peer.audioSender
            : kind === 'video'
              ? peer.videoSender
              : track
                ? this.ensureScreenTransceiver(peer).sender
                : peer.screenSender
        if (!sender) return
        try {
          await sender.replaceTrack(track)
        } catch {
          // Sender may be closed mid-teardown.
        }
      }),
    )
    if ((kind === 'video' || kind === 'screen') && track) this.quality.reapply()
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
    await this.enqueue(peer, () => this.applySignal(peer, payload))
  }

  private async applySignal(peer: Peer, payload: WsRtcSignalPayload): Promise<void> {
    const { pc } = peer
    try {
      if (payload.description) {
        const description = payload.description as RTCSessionDescriptionInit
        const readyForOffer = !peer.makingOffer && (pc.signalingState === 'stable' || peer.isSettingRemoteAnswerPending)
        const offerCollision = description.type === 'offer' && !readyForOffer

        peer.ignoreOffer = !peer.polite && offerCollision
        if (peer.ignoreOffer) return

        // Chromium implicit-rollbacks; Safari and iOS libwebrtc do not.
        if (offerCollision) {
          try {
            await pc.setLocalDescription({ type: 'rollback' })
          } catch {
            // Older engines reject explicit rollback; setRemoteDescription may still recover.
          }
        }

        peer.isSettingRemoteAnswerPending = description.type === 'answer'
        await pc.setRemoteDescription(description)
        peer.isSettingRemoteAnswerPending = false
        this.adoptScreenTransceiver(peer)

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
      screenStream: null,
      audioSender: audioTransceiver.sender,
      videoSender: videoTransceiver.sender,
      screenSender: null,
      screenTransceiver: null,
      polite: this.opts.selfUserId < userId,
      makingOffer: false,
      ignoreOffer: false,
      isSettingRemoteAnswerPending: false,
      pendingCandidates: [],
      disconnectedTimer: null,
      connectingTimer: null,
      giveUpTimer: null,
      state: 'connecting',
      dataChannel: null,
      holdNegotiate: true,
      queue: Promise.resolve(),
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
    if (this.localScreen) void this.ensureScreenTransceiver(peer).sender.replaceTrack(this.localScreen)
    void prioritizeAudioSender(audioTransceiver.sender)

    pc.onnegotiationneeded = () => {
      void this.makeOffer(peer)
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

    pc.ontrack = (ev) => {
      const { track, transceiver } = ev
      if (this.isScreenTransceiver(peer, transceiver)) {
        this.bindScreenTrack(peer, track)
        return
      }
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
        this.quality.sampleIcePath(userId)
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
    this.armConnectingTimer(peer)
    this.opts.events.onRemoteStream(userId, stream)
    this.opts.events.onPeerState(userId, 'connecting')
  }

  private removePeer(userId: string): void {
    const peer = this.peers.get(userId)
    if (!peer) return
    this.peers.delete(userId)
    this.clearDisconnectedTimer(peer)
    this.clearConnectingTimer(peer)
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
    this.opts.events.onRemoteScreenStream?.(userId, null)
  }

  private bindScreenTrack(peer: Peer, track: MediaStreamTrack): void {
    const publish = () => {
      const live = track.readyState === 'live' && !track.muted
      if (live) {
        peer.screenStream = new MediaStream([track])
        this.opts.events.onRemoteScreenStream?.(peer.userId, peer.screenStream)
      } else {
        peer.screenStream = null
        this.opts.events.onRemoteScreenStream?.(peer.userId, null)
      }
    }
    track.onmute = publish
    track.onunmute = publish
    track.onended = publish
    publish()
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
    if (state === 'connecting') this.armConnectingTimer(peer)
    else this.clearConnectingTimer(peer)
    this.opts.events.onPeerState(peer.userId, state)
  }

  private enqueue(peer: Peer, fn: () => Promise<void>): Promise<void> {
    const next = peer.queue.then(fn, fn)
    peer.queue = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  /**
   * Second video m-line — created when we start sharing, or adopted from a remote
   * offer that already has one (newer iOS). Camera stays `videos[0]`.
   */
  private findScreenTransceiver(peer: Peer): RTCRtpTransceiver | null {
    const videos = peer.pc.getTransceivers().filter((t) => t.receiver.track?.kind === 'video')
    return videos.length >= 2 ? (videos[1] ?? null) : null
  }

  private adoptScreenTransceiver(peer: Peer): void {
    if (peer.screenTransceiver) return
    const extra = this.findScreenTransceiver(peer)
    if (!extra) return
    peer.screenTransceiver = extra
    peer.screenSender = extra.sender
    if (this.localScreen) void extra.sender.replaceTrack(this.localScreen)
  }

  private ensureScreenTransceiver(peer: Peer): RTCRtpTransceiver {
    this.adoptScreenTransceiver(peer)
    if (peer.screenTransceiver) return peer.screenTransceiver
    const created = peer.pc.addTransceiver('video', { direction: 'sendrecv' })
    peer.screenTransceiver = created
    peer.screenSender = created.sender
    return created
  }

  private isScreenTransceiver(peer: Peer, transceiver: RTCRtpTransceiver | undefined): boolean {
    if (!transceiver) return false
    if (peer.screenTransceiver === transceiver) return true
    return this.findScreenTransceiver(peer) === transceiver
  }

  private armConnectingTimer(peer: Peer): void {
    this.clearConnectingTimer(peer)
    peer.connectingTimer = setTimeout(() => {
      peer.connectingTimer = null
      if (this.destroyed || peer.state !== 'connecting') return
      if (!peer.pc.remoteDescription) void this.makeOffer(peer)
      else this.restartIcePeer(peer)
    }, CONNECTING_RESTART_MS)
  }

  private clearConnectingTimer(peer: Peer): void {
    if (!peer.connectingTimer) return
    clearTimeout(peer.connectingTimer)
    peer.connectingTimer = null
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
