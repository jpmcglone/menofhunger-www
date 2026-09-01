import { shallowRef, type ShallowRef } from 'vue'
import type { CallSession, CallType, CallsAck, RtcIceServer, WsCallsIncomingPayload, WsRtcSignalPayload } from '~/types/api'
import type { CallsCallback } from '~/composables/usePresence'
import { useUsersStore, type PublicUserEntity } from '~/composables/useUsersStore'
import { createRingtone, type Ringtone } from './callRingtone'
import { reduceCallsIncoming, reduceCallsUpdated, remotePeerIds, type CallPhase, type CallSessionState } from './callSessionReducer'
import { qualityBarsFor } from './callQuality'
import { acquireAudioTrack, acquireCallMedia, acquireVideoTrack, stopTrack } from './useCallDevices'
import type { CallTransport, PeerMediaState } from './transport/CallTransport'
import { PeerToPeerCallTransport } from './transport/PeerToPeerCallTransport'

export type { CallPhase } from './callSessionReducer'

export type CallDisplayUser = {
  id: string
  username: string | null
  name: string | null
  avatarUrl: string | null
  premiumPlus: boolean
}

/**
 * Media objects can't live in `useState` (not serializable, and there is exactly one
 * media pipeline per tab anyway). Module scope on the client is the singleton.
 */
const localStream: ShallowRef<MediaStream | null> = shallowRef(null)
const remoteStreams: ShallowRef<Record<string, MediaStream>> = shallowRef({})
let transport: CallTransport | null = null
let iceServers: RtcIceServer[] = []
let ringtone: Ringtone | null = null
let ringback: Ringtone | null = null
let unbind: (() => void) | null = null
let rejoinTimer: ReturnType<typeof setTimeout> | null = null

const REJOIN_RETRY_MS = 3_000

export function useCallSession() {
  const state = useState<CallSessionState>('call-session-state', () => ({ phase: 'idle', call: null, incoming: null }))
  const isMicEnabled = useState<boolean>('call-mic-enabled', () => true)
  const isCameraEnabled = useState<boolean>('call-camera-enabled', () => false)
  const micError = useState<string | null>('call-mic-error', () => null)
  const cameraError = useState<string | null>('call-camera-error', () => null)
  const peerStates = useState<Record<string, PeerMediaState>>('call-peer-states', () => ({}))
  const qualityTier = useState<number>('call-quality-tier', () => 0)
  const facingMode = useState<'user' | 'environment'>('call-facing-mode', () => 'user')
  const audioDeviceId = useState<string | null>('call-audio-device', () => null)
  const videoDeviceId = useState<string | null>('call-video-device', () => null)
  const speakerDeviceId = useState<string | null>('call-speaker-device', () => null)
  /** Overlay collapsed into the mini bar so the user can browse while on the call. */
  const minimized = useState<boolean>('call-overlay-minimized', () => false)
  /** Elapsed-time anchor for the in-call timer (ms epoch when this tab connected). */
  const connectedAt = useState<number | null>('call-connected-at', () => null)
  /** Direct call we started: who we're ringing (not yet a participant). */
  const outgoingCalleeId = useState<string | null>('call-outgoing-callee', () => null)

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

  async function acquireForCall(type: CallType): Promise<boolean> {
    const media = await acquireCallMedia({
      audio: true,
      video: type === 'video',
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
    transport = new PeerToPeerCallTransport(
      {
        callId,
        selfUserId: meId.value,
        iceServers,
        sendSignal: (toUserId, signal) => presence.emitRtcSignal(callId, toUserId, signal),
        events: {
          onRemoteStream(userId, stream) {
            const next = { ...remoteStreams.value }
            if (stream) next[userId] = stream
            else delete next[userId]
            remoteStreams.value = next
          },
          onPeerState(userId, s) {
            peerStates.value = { ...peerStates.value, [userId]: s }
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
    releaseLocalMedia()
    remoteStreams.value = {}
    peerStates.value = {}
    qualityTier.value = 0
    connectedAt.value = null
    outgoingCalleeId.value = null
    minimized.value = false
    if (rejoinTimer) {
      clearTimeout(rejoinTimer)
      rejoinTimer = null
    }
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
    return ack.call
  }

  function enterCall(session: CallSession) {
    state.value = { ...state.value, phase: 'in_call', call: session, incoming: null }
    connectedAt.value = connectedAt.value ?? Date.now()
    minimized.value = false
    stopRinging()
    presence.emitCallsState(session.id, { micEnabled: isMicEnabled.value, cameraEnabled: isCameraEnabled.value })
    transport?.setPeers(remotePeerIds(session, meId.value))
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
      premiumPlus: Boolean(u?.premiumPlus),
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
    await acquireForCall(session.type)

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

  // ─── Realtime ───────────────────────────────────────────────────────────────

  function onUpdated(session: CallSession) {
    const { state: next, effects } = reduceCallsUpdated(state.value, session, meId.value)
    state.value = next
    for (const e of effects) {
      if (e.type === 'ended') {
        teardown()
        toast.push({ title: e.reason === 'removed' ? 'You were disconnected from the call.' : 'Call ended.', durationMs: 3000 })
      } else if (e.type === 'dismiss_incoming') {
        stopRinging()
      } else if (e.type === 'connected') {
        stopRinging()
        connectedAt.value = connectedAt.value ?? Date.now()
        presence.emitCallsState(session.id, { micEnabled: isMicEnabled.value, cameraEnabled: isCameraEnabled.value })
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
      return
    }
    const code = ack.error?.code
    if (code === 'call_not_found' || code === 'call_ended') {
      teardown()
      state.value = { phase: 'idle', call: null, incoming: null }
      toast.push({ title: 'Call ended.', durationMs: 3000 })
      return
    }
    if (code === 'already_in_call' && !rejoinTimer) {
      // Server hasn't noticed the old socket drop yet; try once more shortly.
      rejoinTimer = setTimeout(() => {
        rejoinTimer = null
        void rejoinAfterReconnect()
      }, REJOIN_RETRY_MS)
    }
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
    }
    presence.addCallsCallback(cb)

    const onPageHide = () => {
      const current = call.value
      if (current && (phase.value === 'in_call' || phase.value === 'outgoing')) void presence.emitCallsLeave(current.id)
    }
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('beforeunload', onPageHide)

    const stopReconnectWatch = watch(
      () => presence.isSocketConnected.value,
      (connected, was) => {
        if (connected && was === false) void rejoinAfterReconnect()
      },
    )

    const stopRouteHook = router.afterEach(() => {
      if (phase.value === 'in_call' || phase.value === 'outgoing') minimized.value = true
    })

    unbind = () => {
      presence.removeCallsCallback(cb)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('beforeunload', onPageHide)
      stopReconnectWatch()
      stopRouteHook()
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
    setCameraDevice,
    setMicrophoneDevice,
    setSpeakerDevice,
    bind,
  }
}
