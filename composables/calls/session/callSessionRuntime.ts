import { shallowRef, type ShallowRef } from 'vue'
import type { RtcIceServer, WsRtcSignalPayload } from '~/types/api'
import type { CallTransport } from '../transport/CallTransport'
import type { SpeakingMonitor } from '../speakingDetector'
import type { Ringtone } from '../callRingtone'
import { createReactionBlip } from '../callReactionSound'
import { createHangupChime } from '../callHangupSound'

export const DEFAULT_RECONNECT_GRACE_MS = 30_000
/** Signals that landed before `createTransport` (join ack). Replay after the transport exists. */
export const MAX_PENDING_SIGNALS = 64

/**
 * Media objects can't live in `useState` (not serializable, and there is exactly one
 * media pipeline per tab anyway). Module scope on the client is the singleton.
 */
export const localStream: ShallowRef<MediaStream | null> = shallowRef(null)
export const localScreenStream: ShallowRef<MediaStream | null> = shallowRef(null)
export const remoteStreams: ShallowRef<Record<string, MediaStream>> = shallowRef({})
export const remoteScreenStreams: ShallowRef<Record<string, MediaStream>> = shallowRef({})

/** Per-tab call singletons shared by the session facade, media, reactions and signaling. */
export const rt = {
  transport: null as CallTransport | null,
  /** Web Audio taps on local + remote streams; drives the "speaking" ring. Lives with the transport. */
  speakingMonitor: null as SpeakingMonitor | null,
  iceServers: [] as RtcIceServer[],
  ringtone: null as Ringtone | null,
  /** The OS "X is calling" notification; closed when the ring stops (answered anywhere, cancelled). */
  incomingNotification: null as Notification | null,
  ringback: null as Ringtone | null,
  unbind: null as (() => void) | null,
  /** Server-owned grace window from the last start/join ack; every give-up timer keys off it. */
  reconnectGraceMs: DEFAULT_RECONNECT_GRACE_MS,
  /** Runs while the signaling socket is down mid-call. */
  socketDownTimer: null as ReturnType<typeof setTimeout> | null,
  reactionPruneTimer: null as ReturnType<typeof setInterval> | null,
  pendingSignals: [] as WsRtcSignalPayload[],
  /** Call id we're joining/starting before `call` is on session state. */
  joiningCallId: null as string | null,
  callAttempt: 0,
}

export const reactionBlip = createReactionBlip()
export const hangupChime = createHangupChime()
