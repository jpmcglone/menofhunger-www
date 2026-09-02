import type { RtcIceCandidate, RtcIceServer, RtcSessionDescription, WsRtcSignalPayload } from '~/types/api'
import type { IcePathKind } from '../callQuality'

/**
 * Per-peer media path state as seen by this tab. Independent of the server-side
 * `connectionState` (which tracks the signaling socket, not the media).
 */
export type PeerMediaState = 'connecting' | 'connected' | 'reconnecting' | 'failed'

export type CallSignal = {
  description?: RtcSessionDescription
  candidate?: RtcIceCandidate
}

export type CallLocalTrackKind = 'audio' | 'video' | 'screen'

export type CallTransportEvents = {
  /** A remote peer's camera/mic stream. `null` when the peer is removed. */
  onRemoteStream: (userId: string, stream: MediaStream | null) => void
  /** A remote peer's screen-share track (separate from their camera). `null` when it ends or the peer leaves. */
  onRemoteScreenStream?: (userId: string, stream: MediaStream | null) => void
  onPeerState: (userId: string, state: PeerMediaState) => void
  /** In-call data-channel payload (reactions). `raw` is already JSON-parsed. */
  onData?: (userId: string, raw: unknown) => void
  /** Selected ICE pair for this peer: TURN / STUN / host. Admin tiles only. */
  onIcePath?: (userId: string, path: IcePathKind | null) => void
}

export type CallTransportOptions = {
  callId: string
  selfUserId: string
  iceServers: RtcIceServer[]
  /** Relay a signal to one remote participant through the authenticated socket. */
  sendSignal: (toUserId: string, signal: CallSignal) => void
  /**
   * How long a peer may stay `reconnecting` before it is marked `failed`. Comes from the
   * server's `reconnectGraceMs` so every client gives up at the same moment the server does.
   */
  reconnectGraceMs?: number
  events: CallTransportEvents
}

/**
 * Transport boundary between the call UI/session and how media actually moves.
 * V1 is a browser-to-browser mesh (`PeerToPeerCallTransport`). A future SFU
 * transport (LiveKit or similar) implements the same interface so `useCallSession`
 * and the components don't change.
 */
export interface CallTransport {
  /**
   * Reconcile the remote participant set. New ids get a connection, missing ids are
   * torn down. Idempotent; call it on every `calls:updated`.
   */
  setPeers(userIds: string[]): void
  /** Relayed SDP / ICE from a remote participant. */
  handleSignal(payload: WsRtcSignalPayload): Promise<void>
  /**
   * Publish (or stop publishing) a local track of the given kind to every peer.
   * `null` stops sending without renegotiating away the transceiver.
   * `screen` is a second video m-line so a share does not replace the camera.
   */
  setLocalTrack(kind: CallLocalTrackKind, track: MediaStreamTrack | null): Promise<void>
  /** Number of remote peers currently wired. */
  peerCount(): number
  /**
   * The network path changed (browser `online`, interface switch). Kick ICE on every peer
   * that isn't healthy instead of waiting for the disconnect timers to notice.
   */
  restartIce(): void
  /**
   * Tab came back (visibility / pageshow). Rebuild failed peers and ICE-restart the rest
   * so a background freeze doesn't leave a dead connection.
   */
  resumeConnections(): void
  /** Send a JSON payload on every open `moh` data channel. */
  sendData(payload: unknown): void
  /** Tear everything down. The instance is unusable afterwards. */
  destroy(): void
}
