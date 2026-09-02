import { shallowRef, type ShallowRef } from 'vue'
import type {
  CallSession,
  CallType,
  CallsAck,
  Message,
  RtcIceServer,
  WsCallsIncomingPayload,
  WsCallsSeatTakenPayload,
  WsRtcSignalPayload,
} from '~/types/api'
import type { CallsCallback, MessagesCallback } from '~/composables/usePresence'
import { useUsersStore, type PublicUserEntity } from '~/composables/useUsersStore'
import { createReactionBlip } from './callReactionSound'
import {
  encodeCallReaction,
  isCallReactionEmoji,
  parseCallReactionPayload,
  pruneCallReactions,
  reduceCallReactions,
  type CallReaction,
} from './callReactions'
import { createRingtone, type Ringtone } from './callRingtone'
import { reduceCallsIncoming, reduceCallsUpdated, remotePeerIds, type CallPhase, type CallSessionState } from './callSessionReducer'
import { qualityBarsFor } from './callQuality'
import { shouldHangUpCallOnPageLifecycle } from './callLifecycle'
import { enterCallPictureInPicture, exitCallPictureInPicture } from './callPictureInPicture'
import { acquireAudioTrack, acquireCallMedia, acquireVideoTrack, canScreenShare, shouldStartCallWithCamera, stopTrack } from './useCallDevices'
import { SpeakingMonitor } from './speakingDetector'
import type { CallTransport, PeerMediaState } from './transport/CallTransport'
import { DEFAULT_RECONNECT_GRACE_MS, PeerToPeerCallTransport } from './transport/PeerToPeerCallTransport'

export type { CallPhase } from './callSessionReducer'
export { canScreenShare } from './useCallDevices'

export type CallDisplayUser = {
  id: string
  username: string | null
  name: string | null
  avatarUrl: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  verifiedStatus: string
}

/**
 * Media objects can't live in `useState` (not serializable, and there is exactly one
 * media pipeline per tab anyway). Module scope on the client is the singleton.
 */
const localStream: ShallowRef<MediaStream | null> = shallowRef(null)
const remoteStreams: ShallowRef<Record<string, MediaStream>> = shallowRef({})
let transport: CallTransport | null = null
/** Web Audio taps on local + remote streams; drives the "speaking" ring. Lives with the transport. */
let speakingMonitor: SpeakingMonitor | null = null
let iceServers: RtcIceServer[] = []
let ringtone: Ringtone | null = null
let ringback: Ringtone | null = null
let unbind: (() => void) | null = null
/** Server-owned grace window from the last start/join ack; every give-up timer keys off it. */
let reconnectGraceMs = DEFAULT_RECONNECT_GRACE_MS
/** Runs while the signaling socket is down mid-call. */
let socketDownTimer: ReturnType<typeof setTimeout> | null = null
/** Browser "Stop sharing" / our toggle: restore camera if it was on before the share. */
let cameraWasOnBeforeShare = false
let reactionPruneTimer: ReturnType<typeof setInterval> | null = null
const reactionBlip = createReactionBlip()

export function useCallSession() {
  const state = useState<CallSessionState>('call-session-state', () => ({ phase: 'idle', call: null, incoming: null }))
  const isMicEnabled = useState<boolean>('call-mic-enabled', () => true)
  const isCameraEnabled = useState<boolean>('call-camera-enabled', () => false)
  const micError = useState<string | null>('call-mic-error', () => null)
  const cameraError = useState<string | null>('call-camera-error', () => null)
  const peerStates = useState<Record<string, PeerMediaState>>('call-peer-states', () => ({}))
  /** userId → currently talking (self included), with hysteresis so it doesn't flicker. */
  const speakingIds = useState<Record<string, number>>('call-speaking-ids', () => ({}))
  const qualityTier = useState<number>('call-quality-tier', () => 0)
  const facingMode = useState<'user' | 'environment'>('call-facing-mode', () => 'user')
  const audioDeviceId = useState<string | null>('call-audio-device', () => null)
  const videoDeviceId = useState<string | null>('call-video-device', () => null)
  const speakerDeviceId = useState<string | null>('call-speaker-device', () => null)
  /** Overlay collapsed into the mini bar so the user can browse while on the call. */
  const minimized = useState<boolean>('call-overlay-minimized', () => false)
  /** Elapsed-time anchor for the in-call timer (ms epoch when this tab connected). */
  const connectedAt = useState<number | null>('call-connected-at', () => null)
  const pendingVoicemail = useState<{ conversationId: string; messageId: string } | null>(
    'call-pending-voicemail',
    () => null,
  )
  let outgoingMessageId: string | null = null
  /** Direct call we started: who we're ringing (not yet a participant). */
  const outgoingCalleeId = useState<string | null>('call-outgoing-callee', () => null)
  const isScreenSharing = useState<boolean>('call-screen-sharing', () => false)
  const reactions = useState<CallReaction[]>('call-reactions', () => [])

  const { user } = useAuth()
  const presence = usePresence()
  const toast = useAppToast()
  const usersStore = useUsersStore()
  const router = useRouter()

  const meId = computed(() => user.value?.id ?? '')
  const phase = computed<CallPhase>(() => state.value.phase)
  const call = computed<CallSession | null>(() => state.value.call)
  const incoming = computed<WsCallsIncomingPayload | null>(() => state.value.incoming)
  const isEngaged = computed(() => phase.value === 'outgoing' || phase.value === 'joining' || phase.value === 'in_call' || phase.value === 'requesting_media')
  const remoteParticipants = computed(() => (call.value ? call.value.participants.filter((p) => p.userId !== meId.value) : []))
  const qualityBars = computed(() => qualityBarsFor(qualityTier.value))

  // ─── Local media ────────────────────────────────────────────────────────────

  function localAudioTrack(): MediaStreamTrack | null {
    return localStream.value?.getAudioTracks()[0] ?? null
  }
  function localVideoTrack(): MediaStreamTrack | null {
    return localStream.value?.getVideoTracks()[0] ?? null
  }

  function releaseLocalMedia() {
    const s = localStream.value
    if (s) for (const t of s.getTracks()) stopTrack(t)
    localStream.value = null
  }

  async function acquireForCall(type: CallType, joining = false): Promise<boolean> {
    const media = await acquireCallMedia({
      audio: true,
      video: shouldStartCallWithCamera(type === 'video', joining),
      audioDeviceId: audioDeviceId.value,
      videoDeviceId: videoDeviceId.value,
      facingMode: facingMode.value,
    })
    localStream.value = media.stream
    micError.value = media.micError
    cameraError.value = media.cameraError
    isMicEnabled.value = Boolean(media.audioTrack)
    isCameraEnabled.value = Boolean(media.videoTrack)
    if (media.micError && !media.audioTrack) {
      toast.push({ title: media.micError, message: 'You can still listen, but others won’t hear you.', tone: 'error', durationMs: 6000 })
    }
    if (type === 'video' && media.cameraError && !media.videoTrack) {
      toast.push({ title: media.cameraError, message: 'Joining with audio only.', durationMs: 5000 })
    }
    return true
  }

  // ─── Transport ──────────────────────────────────────────────────────────────

  function createTransport(callId: string) {
    transport?.destroy()
    peerStates.value = {}
    remoteStreams.value = {}
    qualityTier.value = 0
    speakingMonitor?.destroy()
    speakingMonitor = new SpeakingMonitor((levels) => {
      speakingIds.value = levels
    })
    speakingMonitor.setStream(meId.value, localStream.value)
    speakingMonitor.setMuted(meId.value, !isMicEnabled.value)
    transport = new PeerToPeerCallTransport(
      {
        callId,
        selfUserId: meId.value,
        iceServers,
        sendSignal: (toUserId, signal) => presence.emitRtcSignal(callId, toUserId, signal),
        reconnectGraceMs,
        events: {
          onRemoteStream(userId, stream) {
            const next = { ...remoteStreams.value }
            if (stream) next[userId] = stream
            else delete next[userId]
            remoteStreams.value = next
            speakingMonitor?.setStream(userId, stream)
          },
          onPeerState(userId, s) {
            peerStates.value = { ...peerStates.value, [userId]: s }
            if (s === 'failed') onPeerFailed()
          },
          onData(userId, raw) {
            ingestReaction(userId, raw)
          },
        },
      },
      () => {
        qualityTier.value = (transport as PeerToPeerCallTransport | null)?.qualityManager.worstTier() ?? 0
      },
    )
    void transport.setLocalTrack('audio', isMicEnabled.value ? localAudioTrack() : null)
    void transport.setLocalTrack('video', isCameraEnabled.value ? localVideoTrack() : null)
  }

  function teardown() {
    stopRinging()
    transport?.destroy()
    transport = null
    speakingMonitor?.destroy()
    speakingMonitor = null
    releaseLocalMedia()
    remoteStreams.value = {}
    peerStates.value = {}
    speakingIds.value = {}
    qualityTier.value = 0
    connectedAt.value = null
    outgoingCalleeId.value = null
    minimized.value = false
    isScreenSharing.value = false
    cameraWasOnBeforeShare = false
    reactions.value = []
    if (reactionPruneTimer) {
      clearInterval(reactionPruneTimer)
      reactionPruneTimer = null
    }
    clearSocketDownTimer()
  }

  function clearSocketDownTimer() {
    if (!socketDownTimer) return
    clearTimeout(socketDownTimer)
    socketDownTimer = null
  }

  /** Unrecoverable mid-call: drop the session and tell the user once. */
  function connectionLost() {
    const current = call.value
    if (current) void presence.emitCallsLeave(current.id)
    teardown()
    state.value = { phase: 'idle', call: null, incoming: null }
    toast.push({ title: 'Connection lost.', message: 'The call couldn’t be reconnected.', tone: 'error', durationMs: 5000 })
  }

  /**
   * A peer's media path gave up after the grace window. In a 1:1 there is nobody left to talk
   * to; in a group the server will remove them from `participants` if their socket also died,
   * otherwise they stay as a failed tile. Give up only when every remote peer has failed.
   */
  function onPeerFailed() {
    const current = call.value
    if (phase.value !== 'in_call' || !current) return
    const ids = remotePeerIds(current, meId.value)
    if (ids.length === 0) return
    if (ids.every((id) => peerStates.value[id] === 'failed')) connectionLost()
  }

  function stopRinging() {
    ringtone?.stop()
    ringtone = null
    ringback?.stop()
    ringback = null
  }

  function applyAck(ack: CallsAck): CallSession | null {
    if (ack.error || !ack.call) {
      toast.push({ title: ack.error?.message ?? 'Couldn’t connect the call.', tone: 'error' })
      return null
    }
    if (ack.iceServers) iceServers = ack.iceServers
    if (typeof ack.reconnectGraceMs === 'number' && ack.reconnectGraceMs > 0) reconnectGraceMs = ack.reconnectGraceMs
    return ack.call
  }

  function enterCall(session: CallSession) {
    state.value = { ...state.value, phase: 'in_call', call: session, incoming: null }
    connectedAt.value = connectedAt.value ?? Date.now()
    minimized.value = false
    stopRinging()
    presence.emitCallsState(session.id, {
      micEnabled: isMicEnabled.value,
      cameraEnabled: isCameraEnabled.value,
      screenSharing: isScreenSharing.value,
    })
    transport?.setPeers(remotePeerIds(session, meId.value))
    ensureReactionPrune()
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  /**
   * Cache display info for everyone who might appear in the call UI. The session
   * DTO only carries user ids; the overlay resolves them through `useUsersStore`.
   */
  function seedParticipants(users: Array<Partial<PublicUserEntity> | null | undefined>): void {
    for (const u of users) if (u?.id) usersStore.upsert(u)
  }

  /** Display record for a participant; always has an id so avatar components accept it. */
  function participantUser(userId: string): CallDisplayUser {
    const u = usersStore.get(userId) ?? (userId === user.value?.id ? user.value : null)
    return {
      id: userId,
      username: u?.username ?? null,
      name: u?.name ?? null,
      avatarUrl: u?.avatarUrl ?? null,
      premium: Boolean(u?.premium),
      premiumPlus: Boolean(u?.premiumPlus),
      isOrganization: Boolean(u?.isOrganization),
      verifiedStatus: u?.verifiedStatus ?? 'none',
    }
  }

  function participantLabel(userId: string): string {
    const u = participantUser(userId)
    return u.name || (u.username ? `@${u.username}` : 'Member')
  }

  async function startCall(
    conversationId: string,
    type: CallType,
    opts?: { participants?: Array<Partial<PublicUserEntity>>; calleeId?: string | null },
  ): Promise<void> {
    if (!import.meta.client || !meId.value) return
    if (phase.value !== 'idle' && phase.value !== 'in_call_elsewhere') {
      toast.push({ title: 'You’re already in a call.' })
      return
    }
    if (opts?.participants) seedParticipants(opts.participants)
    outgoingCalleeId.value = opts?.calleeId ?? null
    state.value = { phase: 'requesting_media', call: null, incoming: null }
    await acquireForCall(type)

    const ack = await presence.emitCallsStart(conversationId, type)
    const session = applyAck(ack)
    if (!session) {
      teardown()
      state.value = { phase: 'idle', call: null, incoming: null }
      return
    }
    createTransport(session.id)
    if (session.status === 'ringing') {
      outgoingMessageId = session.messageId
      state.value = { phase: 'outgoing', call: session, incoming: null }
      minimized.value = false
      ringback = createRingtone('outgoing')
      ringback.start()
    } else {
      enterCall(session)
    }
  }

  async function joinCall(
    session: Pick<CallSession, 'id' | 'type'>,
    opts?: { participants?: Array<Partial<PublicUserEntity>> },
  ): Promise<void> {
    if (!import.meta.client || !meId.value) return
    if (phase.value !== 'idle' && phase.value !== 'in_call_elsewhere' && phase.value !== 'incoming') {
      toast.push({ title: 'You’re already in a call.' })
      return
    }
    if (opts?.participants) seedParticipants(opts.participants)
    stopRinging()
    state.value = { phase: 'requesting_media', call: null, incoming: null }
    await acquireForCall(session.type, true)

    state.value = { phase: 'joining', call: null, incoming: null }
    const ack = await presence.emitCallsJoin(session.id)
    const joined = applyAck(ack)
    if (!joined) {
      teardown()
      state.value = { phase: 'idle', call: null, incoming: null }
      return
    }
    createTransport(joined.id)
    enterCall(joined)
  }

  async function acceptIncoming(): Promise<void> {
    const inc = incoming.value
    if (!inc) return
    await joinCall(inc.call)
  }

  async function declineIncoming(): Promise<void> {
    const inc = incoming.value
    if (!inc) return
    stopRinging()
    state.value = { ...state.value, phase: 'idle', incoming: null }
    await presence.emitCallsDecline(inc.call.id)
  }

  function dismissIncoming() {
    stopRinging()
    if (state.value.phase === 'incoming') state.value = { ...state.value, phase: 'idle', incoming: null }
  }

  async function leaveCall(): Promise<void> {
    const current = call.value
    const wasOutgoing = phase.value === 'outgoing'
    teardown()
    state.value = { phase: 'idle', call: null, incoming: null }
    if (current && !wasOutgoing) toast.push({ title: 'You left the call.', durationMs: 2500 })
    if (current) await presence.emitCallsLeave(current.id)
  }

  async function toggleMic(): Promise<void> {
    const current = call.value
    let track = localAudioTrack()
    if (!track) {
      const got = await acquireAudioTrack({ audioDeviceId: audioDeviceId.value })
      if (!got.track) {
        micError.value = got.error
        toast.push({ title: got.error ?? 'Couldn’t access your microphone.', tone: 'error' })
        return
      }
      track = got.track
      micError.value = null
      ;(localStream.value ?? (localStream.value = new MediaStream())).addTrack(track)
      isMicEnabled.value = true
      await transport?.setLocalTrack('audio', track)
    } else {
      isMicEnabled.value = !isMicEnabled.value
      track.enabled = isMicEnabled.value
    }
    if (current) presence.emitCallsState(current.id, { micEnabled: isMicEnabled.value })
  }

  async function toggleCamera(): Promise<void> {
    if (isScreenSharing.value) {
      await stopScreenShare({ restoreCamera: false })
      return
    }
    const current = call.value
    if (isCameraEnabled.value) {
      // Stop publishing entirely (privacy + bandwidth) rather than sending black frames.
      const track = localVideoTrack()
      await transport?.setLocalTrack('video', null)
      if (track) {
        localStream.value?.removeTrack(track)
        stopTrack(track)
      }
      localStream.value = localStream.value ? new MediaStream(localStream.value.getTracks()) : null
      isCameraEnabled.value = false
    } else {
      const got = await acquireVideoTrack({ videoDeviceId: videoDeviceId.value, facingMode: facingMode.value })
      if (!got.track) {
        cameraError.value = got.error
        toast.push({ title: got.error ?? 'Couldn’t access your camera.', tone: 'error' })
        return
      }
      cameraError.value = null
      const s = new MediaStream(localStream.value?.getTracks() ?? [])
      s.addTrack(got.track)
      localStream.value = s
      isCameraEnabled.value = true
      await transport?.setLocalTrack('video', got.track)
    }
    if (current) presence.emitCallsState(current.id, { cameraEnabled: isCameraEnabled.value })
  }

  async function replaceVideoTrack(next: MediaStreamTrack) {
    const prev = localVideoTrack()
    const s = new MediaStream(localStream.value?.getTracks().filter((t) => t !== prev) ?? [])
    s.addTrack(next)
    localStream.value = s
    stopTrack(prev)
    await transport?.setLocalTrack('video', next)
  }

  async function switchCamera(): Promise<void> {
    if (!isCameraEnabled.value) return
    const nextFacing = facingMode.value === 'user' ? 'environment' : 'user'
    videoDeviceId.value = null
    const got = await acquireVideoTrack({ facingMode: nextFacing })
    if (!got.track) {
      toast.push({ title: got.error ?? 'Couldn’t switch camera.', tone: 'error' })
      return
    }
    facingMode.value = nextFacing
    await replaceVideoTrack(got.track)
  }

  async function setCameraDevice(deviceId: string): Promise<void> {
    videoDeviceId.value = deviceId
    if (!isCameraEnabled.value) return
    const got = await acquireVideoTrack({ videoDeviceId: deviceId })
    if (!got.track) {
      toast.push({ title: got.error ?? 'Couldn’t switch camera.', tone: 'error' })
      return
    }
    await replaceVideoTrack(got.track)
  }

  async function setMicrophoneDevice(deviceId: string): Promise<void> {
    audioDeviceId.value = deviceId
    const got = await acquireAudioTrack({ audioDeviceId: deviceId })
    if (!got.track) {
      toast.push({ title: got.error ?? 'Couldn’t switch microphone.', tone: 'error' })
      return
    }
    const prev = localAudioTrack()
    got.track.enabled = isMicEnabled.value
    const s = new MediaStream(localStream.value?.getTracks().filter((t) => t !== prev) ?? [])
    s.addTrack(got.track)
    localStream.value = s
    stopTrack(prev)
    await transport?.setLocalTrack('audio', got.track)
  }

  function setSpeakerDevice(deviceId: string): void {
    speakerDeviceId.value = deviceId
  }

  async function startScreenShare(): Promise<void> {
    if (!canScreenShare() || isScreenSharing.value) return
    let display: MediaStream
    try {
      display = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { max: 15 } }, audio: false })
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name !== 'NotAllowedError' && name !== 'AbortError') {
        toast.push({ title: 'Couldn’t share your screen.', tone: 'error' })
      }
      return
    }
    const track = display.getVideoTracks()[0]
    if (!track) return
    try {
      track.contentHint = 'detail'
    } catch {
      // Older browsers ignore contentHint.
    }
    cameraWasOnBeforeShare = isCameraEnabled.value && !isScreenSharing.value
    const prev = localVideoTrack()
    const s = new MediaStream(localStream.value?.getTracks().filter((t) => t !== prev) ?? [])
    s.addTrack(track)
    localStream.value = s
    if (prev) stopTrack(prev)
    isScreenSharing.value = true
    isCameraEnabled.value = true
    track.onended = () => {
      void stopScreenShare({ restoreCamera: cameraWasOnBeforeShare })
    }
    await transport?.setLocalTrack('video', track)
    const current = call.value
    if (current) presence.emitCallsState(current.id, { screenSharing: true, cameraEnabled: true })
  }

  async function stopScreenShare(opts?: { restoreCamera?: boolean }): Promise<void> {
    if (!isScreenSharing.value) return
    const restore = opts?.restoreCamera ?? cameraWasOnBeforeShare
    const track = localVideoTrack()
    await transport?.setLocalTrack('video', null)
    if (track) {
      localStream.value?.removeTrack(track)
      stopTrack(track)
    }
    localStream.value = localStream.value ? new MediaStream(localStream.value.getTracks()) : null
    isScreenSharing.value = false
    isCameraEnabled.value = false
    cameraWasOnBeforeShare = false
    const current = call.value
    if (restore && current) {
      const got = await acquireVideoTrack({ videoDeviceId: videoDeviceId.value, facingMode: facingMode.value })
      if (got.track) {
        const s = new MediaStream(localStream.value?.getTracks() ?? [])
        s.addTrack(got.track)
        localStream.value = s
        isCameraEnabled.value = true
        await transport?.setLocalTrack('video', got.track)
      }
    }
    if (current) presence.emitCallsState(current.id, { screenSharing: false, cameraEnabled: isCameraEnabled.value })
  }

  async function toggleScreenShare(): Promise<void> {
    if (isScreenSharing.value) await stopScreenShare()
    else await startScreenShare()
  }

  function ensureReactionPrune() {
    if (reactionPruneTimer || !import.meta.client) return
    reactionPruneTimer = setInterval(() => {
      reactions.value = pruneCallReactions(reactions.value, Date.now())
    }, 400)
  }

  function ingestReaction(userId: string, raw: unknown) {
    const parsed = parseCallReactionPayload(raw)
    if (!parsed) return
    const incoming: CallReaction = {
      id: `${userId}-${parsed.at}-${parsed.emoji}`,
      userId,
      emoji: parsed.emoji,
      at: parsed.at,
    }
    reactions.value = reduceCallReactions(reactions.value, incoming, Date.now())
    reactionBlip.play(speakerDeviceId.value)
    ensureReactionPrune()
  }

  function sendReaction(emoji: string) {
    if (!isCallReactionEmoji(emoji) || !meId.value) return
    const at = Date.now()
    const payload = encodeCallReaction(emoji, at)
    transport?.sendData(payload)
    ingestReaction(meId.value, payload)
  }

  // ─── Realtime ───────────────────────────────────────────────────────────────

  function onUpdated(session: CallSession) {
    const { state: next, effects } = reduceCallsUpdated(state.value, session, meId.value)
    state.value = next
    // A muted peer's tile must never ring, even if their analyser still hears room noise.
    for (const p of session.participants) {
      if (p.userId !== meId.value) speakingMonitor?.setMuted(p.userId, !p.micEnabled)
    }
    for (const e of effects) {
      if (e.type === 'ended') {
        teardown()
        toast.push({ title: e.reason === 'removed' ? 'You were disconnected from the call.' : 'Call ended.', durationMs: 3000 })
      } else if (e.type === 'dismiss_incoming') {
        stopRinging()
      } else if (e.type === 'connected') {
        stopRinging()
        connectedAt.value = connectedAt.value ?? Date.now()
        presence.emitCallsState(session.id, {
          micEnabled: isMicEnabled.value,
          cameraEnabled: isCameraEnabled.value,
          screenSharing: isScreenSharing.value,
        })
      } else if (e.type === 'peers') {
        transport?.setPeers(e.userIds)
      }
    }
  }

  function onIncoming(payload: WsCallsIncomingPayload) {
    const next = reduceCallsIncoming(state.value, payload)
    if (next === state.value) return
    seedParticipants([payload.caller])
    state.value = next
    ringtone = createRingtone('incoming')
    ringtone.start()
    notifyIfHidden(payload)
  }

  function onSignal(payload: WsRtcSignalPayload) {
    if (!call.value || payload.callId !== call.value.id) return
    void transport?.handleSignal(payload)
  }

  function notifyIfHidden(payload: WsCallsIncomingPayload) {
    if (!import.meta.client || typeof Notification === 'undefined') return
    if (document.visibilityState === 'visible') return
    if (Notification.permission !== 'granted') return
    try {
      const name = payload.caller.name || (payload.caller.username ? `@${payload.caller.username}` : 'Someone')
      const n = new Notification(`${name} is calling`, {
        body: payload.call.type === 'video' ? 'Incoming video call' : 'Incoming voice call',
        tag: `call-${payload.call.id}`,
      })
      n.onclick = () => {
        window.focus()
        n.close()
      }
    } catch {
      // Notifications unavailable in this context.
    }
  }

  /** Socket came back mid-call: re-bind this tab to its seat before the server's grace expires. */
  async function rejoinAfterReconnect() {
    const current = call.value
    if (!current || (phase.value !== 'in_call' && phase.value !== 'outgoing')) return
    const ack = await presence.emitCallsJoin(current.id)
    if (ack.call) {
      state.value = { ...state.value, call: ack.call }
      transport?.setPeers(remotePeerIds(ack.call, meId.value))
      transport?.resumeConnections()
      return
    }
    const code = ack.error?.code
    if (code === 'call_not_found' || code === 'call_ended') {
      teardown()
      state.value = { phase: 'idle', call: null, incoming: null }
      toast.push({ title: 'Call ended.', durationMs: 3000 })
    }
  }

  /** iOS stops camera/mic tracks when the page is frozen; grab them again if they died. */
  async function restoreLocalTracks() {
    if (phase.value !== 'in_call' && phase.value !== 'outgoing') return
    if (isMicEnabled.value) {
      const audio = localAudioTrack()
      if (!audio || audio.readyState === 'ended') {
        const got = await acquireAudioTrack({ audioDeviceId: audioDeviceId.value })
        if (got.track) {
          got.track.enabled = true
          const prev = localAudioTrack()
          const s = new MediaStream(localStream.value?.getTracks().filter((t) => t !== prev) ?? [])
          s.addTrack(got.track)
          localStream.value = s
          stopTrack(prev)
          await transport?.setLocalTrack('audio', got.track)
        }
      }
    }
    if (isCameraEnabled.value && !isScreenSharing.value) {
      const video = localVideoTrack()
      if (!video || video.readyState === 'ended') {
        const got = await acquireVideoTrack({ videoDeviceId: videoDeviceId.value, facingMode: facingMode.value })
        if (got.track) await replaceVideoTrack(got.track)
      }
    }
  }

  async function resumeAfterForeground() {
    if (phase.value !== 'in_call' && phase.value !== 'outgoing') return
    await exitCallPictureInPicture()
    await restoreLocalTracks()
    transport?.resumeConnections()
    if (presence.isSocketConnected.value) await rejoinAfterReconnect()
  }

  /**
   * One seat per member: a newer tab or device of ours joined this call and the server handed
   * it our seat. Tear down locally WITHOUT `calls:leave` — that would hang up the newcomer.
   */
  function onSeatTaken(payload: WsCallsSeatTakenPayload) {
    const current = call.value
    if (!current || current.id !== payload.callId) return
    if (phase.value !== 'in_call' && phase.value !== 'outgoing' && phase.value !== 'joining') return
    if (presence.getSocketId() !== payload.socketId) return
    teardown()
    state.value = { phase: 'in_call_elsewhere', call: current, incoming: null }
    toast.push({ title: 'Call moved to another tab or device.', durationMs: 3000 })
  }

  /**
   * Wire realtime + lifecycle once per tab. Called from the call host component that
   * lives in GlobalOverlays, so it's active on every page.
   */
  function bind(): () => void {
    if (!import.meta.client || unbind) return unbind ?? (() => {})
    const cb: CallsCallback = {
      onIncoming: (p) => onIncoming(p),
      onUpdated: (p) => onUpdated(p.call),
      onSignal: (p) => onSignal(p),
      onSeatTaken: (p) => onSeatTaken(p),
    }
    presence.addCallsCallback(cb)

    const messagesCb: MessagesCallback = {
      onMessageEdited: (payload) => {
        const message = payload.message as Message | undefined
        if (!message || message.id !== outgoingMessageId) return
        if (message.kind !== 'call' || message.call?.outcome !== 'missed') return
        if (message.media?.length) return
        pendingVoicemail.value = { conversationId: payload.conversationId ?? message.conversationId, messageId: message.id }
      },
    }
    presence.addMessagesCallback(messagesCb)

    const hangUpIfClosing = () => {
      const current = call.value
      if (current && (phase.value === 'in_call' || phase.value === 'outgoing')) void presence.emitCallsLeave(current.id)
    }
    const onPageHide = () => {
      if (phase.value === 'in_call') void enterCallPictureInPicture()
      if (shouldHangUpCallOnPageLifecycle('pagehide')) hangUpIfClosing()
    }
    const onBeforeUnload = () => {
      if (shouldHangUpCallOnPageLifecycle('beforeunload')) hangUpIfClosing()
    }
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onBeforeUnload)

    const stopReconnectWatch = watch(
      () => presence.isSocketConnected.value,
      (connected, was) => {
        if (connected) {
          clearSocketDownTimer()
          if (was === false) void rejoinAfterReconnect()
          return
        }
        // The server drops our seat after `reconnectGraceMs`; stop spinning at the same moment.
        if (!isEngaged.value || socketDownTimer) return
        socketDownTimer = setTimeout(() => {
          socketDownTimer = null
          if (!presence.isSocketConnected.value && isEngaged.value) connectionLost()
        }, reconnectGraceMs)
      },
    )

    // Network came back (Wi-Fi ↔ hotspot, VPN toggle): don't wait for ICE to time out.
    const onOnline = () => {
      if (phase.value === 'in_call') transport?.resumeConnections()
    }
    window.addEventListener('online', onOnline)

    // Background: keep the call (PiP) instead of hanging up. Foreground: restore tracks + ICE.
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') {
        if (phase.value === 'in_call') void enterCallPictureInPicture()
        return
      }
      if (phase.value === 'in_call' || phase.value === 'outgoing') void resumeAfterForeground()
    }
    document.addEventListener('visibilitychange', onVisibility)
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted && (phase.value === 'in_call' || phase.value === 'outgoing')) void resumeAfterForeground()
    }
    window.addEventListener('pageshow', onPageShow)

    const stopRouteHook = router.afterEach(() => {
      if (phase.value === 'in_call' || phase.value === 'outgoing') minimized.value = true
    })

    // The local MediaStream object is replaced on every mic/camera swap; re-tap it each time.
    const stopLocalSpeakingWatch = watch([localStream, isMicEnabled], ([stream, micOn]) => {
      speakingMonitor?.setStream(meId.value, stream)
      speakingMonitor?.setMuted(meId.value, !micOn)
    })

    unbind = () => {
      stopLocalSpeakingWatch()
      presence.removeCallsCallback(cb)
      presence.removeMessagesCallback(messagesCb)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibility)
      stopReconnectWatch()
      stopRouteHook()
      clearSocketDownTimer()
      unbind = null
    }
    return unbind
  }

  return {
    phase,
    call,
    incoming,
    isEngaged,
    remoteParticipants,
    localStream,
    remoteStreams,
    peerStates,
    speakingIds,
    isMicEnabled,
    isCameraEnabled,
    micError,
    cameraError,
    qualityTier,
    qualityBars,
    facingMode,
    audioDeviceId,
    videoDeviceId,
    speakerDeviceId,
    minimized,
    connectedAt,
    outgoingCalleeId,
    isScreenSharing,
    reactions,
    pendingVoicemail,
    dismissVoicemail: () => { pendingVoicemail.value = null },
    participantUser,
    participantLabel,
    startCall,
    joinCall,
    acceptIncoming,
    declineIncoming,
    dismissIncoming,
    leaveCall,
    toggleMic,
    toggleCamera,
    switchCamera,
    toggleScreenShare,
    sendReaction,
    setCameraDevice,
    setMicrophoneDevice,
    setSpeakerDevice,
    bind,
  }
}
