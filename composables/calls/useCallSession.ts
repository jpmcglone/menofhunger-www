import type { CallSession, CallType } from '~/types/api'
import type { PublicUserEntity } from '~/composables/useUsersStore'
import { createRingtone } from './callRingtone'
import type { CallReloadMarker } from './callReloadRecovery'
import { acquireCallMedia, stopTrack } from './useCallDevices'
import { localScreenStream, localStream, remoteScreenStreams, remoteStreams, rt } from './session/callSessionRuntime'
import { useCallSessionState } from './session/useCallSessionState'
import { useCallMedia } from './session/useCallMedia'
import { useCallReactions } from './session/useCallReactions'
import { useCallSignaling } from './session/useCallSignaling'

export type { CallPhase } from './callSessionReducer'
export { canScreenShare } from './useCallDevices'

export type CallDisplayUser = {
  id: string
  username: string | null
  name: string | null
  avatarUrl: string | null
  avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  verifiedStatus: string
}

/**
 * Public facade for the tab's call. State lives in useCallSessionState, capture in useCallMedia,
 * reactions in useCallReactions, and transport/realtime in useCallSignaling; this file owns the
 * user-facing actions (start, join, accept, decline, leave).
 */
export function useCallSession() {
  const s = useCallSessionState()
  const {
    state,
    isMicEnabled,
    isCameraEnabled,
    micError,
    cameraError,
    minimized,
    outgoingCalleeId,
    user,
    presence,
    toast,
    usersStore,
    meId,
    phase,
    call,
    incoming,
  } = s
  const inst: { outgoingMessageId: string | null } = { outgoingMessageId: null }
  const media = useCallMedia(s)
  const { acquireForCall } = media
  const reactionsApi = useCallReactions(s)
  const signaling = useCallSignaling(s, media, reactionsApi, inst, { seedParticipants, joinCall })
  const { createTransport, shouldPlayHangupChime, playHangupChime, clearReloadMarker, teardown, stopRinging, applyAck, enterCall } = signaling

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
      avatarUrl: u?.avatarUrl ?? null, avatarVideo: u?.avatarVideo ?? null,
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
    if (session) rt.joiningCallId = session.id
    if (!session) {
      teardown()
      state.value = { phase: 'idle', call: null, incoming: null }
      return
    }
    createTransport(session.id)
    if (session.status === 'ringing') {
      inst.outgoingMessageId = session.messageId
      state.value = { phase: 'outgoing', call: session, incoming: null }
      minimized.value = false
      rt.ringback = createRingtone('outgoing')
      rt.ringback.start()
    } else {
      enterCall(session)
    }
  }

  async function joinCall(
    session: Pick<CallSession, 'id' | 'type'>,
    opts?: { participants?: Array<Partial<PublicUserEntity>>; resume?: CallReloadMarker },
  ): Promise<void> {
    if (!import.meta.client || !meId.value) return
    if (phase.value !== 'idle' && phase.value !== 'in_call_elsewhere' && phase.value !== 'incoming') {
      toast.push({ title: 'You’re already in a call.' })
      return
    }
    const attempt = ++rt.callAttempt
    if (opts?.participants) seedParticipants(opts.participants)
    stopRinging()
    state.value = { phase: 'requesting_media', call: null, incoming: null }
    if (opts?.resume) {
      const marker = opts.resume
      const media = await acquireCallMedia({ audio: marker.micEnabled, video: marker.cameraEnabled })
      // Never resurrect capture after logout, another call, or expiry while permission was pending.
      if (attempt !== rt.callAttempt || meId.value !== marker.userId || state.value.phase !== 'requesting_media' || Date.now() >= marker.expiresAt) {
        for (const track of media.stream?.getTracks() ?? []) stopTrack(track)
        if (attempt !== rt.callAttempt) return
        teardown()
        state.value = { phase: 'idle', call: null, incoming: null }
        return
      }
      localStream.value = media.stream
      isMicEnabled.value = marker.micEnabled && Boolean(media.audioTrack)
      isCameraEnabled.value = marker.cameraEnabled && Boolean(media.videoTrack)
      micError.value = media.micError
      cameraError.value = media.cameraError
    } else await acquireForCall(session.type, true)

    rt.joiningCallId = session.id
    state.value = { phase: 'joining', call: null, incoming: null }
    const ack = await presence.emitCallsJoin(session.id, opts?.resume?.sessionId)
    if (attempt !== rt.callAttempt) {
      if (ack.call && !call.value) void presence.emitCallsLeave(ack.call.id)
      return
    }
    const joined = applyAck(ack)
    if (!joined) {
      teardown()
      state.value = { phase: 'idle', call: null, incoming: null }
      return
    }
    clearReloadMarker()
    createTransport(joined.id)
    if (joined.status === 'ringing') {
      state.value = { phase: 'outgoing', call: joined, incoming: null }
      rt.ringback = createRingtone('outgoing')
      rt.ringback.start()
    } else enterCall(joined)
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
    const chime = shouldPlayHangupChime()
    teardown()
    state.value = { phase: 'idle', call: null, incoming: null }
    if (chime) playHangupChime()
    if (current && !wasOutgoing) toast.push({ title: 'You left the call.', durationMs: 2500 })
    if (current) await presence.emitCallsLeave(current.id)
  }


  return {
    phase,
    call,
    incoming,
    isEngaged: s.isEngaged,
    remoteParticipants: s.remoteParticipants,
    localStream,
    localScreenStream,
    remoteStreams,
    remoteScreenStreams,
    peerStates: s.peerStates,
    speakingIds: s.speakingIds,
    icePaths: s.icePaths,
    isMicEnabled,
    isCameraEnabled,
    micError,
    cameraError,
    qualityTier: s.qualityTier,
    qualityBars: s.qualityBars,
    facingMode: s.facingMode,
    audioDeviceId: s.audioDeviceId,
    videoDeviceId: s.videoDeviceId,
    speakerDeviceId: s.speakerDeviceId,
    minimized,
    connectedAt: s.connectedAt,
    outgoingCalleeId,
    isScreenSharing: s.isScreenSharing,
    reactions: s.reactions,
    pendingVoicemail: s.pendingVoicemail,
    dismissVoicemail: () => { s.pendingVoicemail.value = null },
    participantUser,
    participantLabel,
    startCall,
    joinCall,
    acceptIncoming,
    declineIncoming,
    dismissIncoming,
    leaveCall,
    toggleMic: media.toggleMic,
    toggleCamera: media.toggleCamera,
    switchCamera: media.switchCamera,
    toggleScreenShare: media.toggleScreenShare,
    sendReaction: reactionsApi.sendReaction,
    toggleHand: reactionsApi.toggleHand,
    setCameraDevice: media.setCameraDevice,
    setMicrophoneDevice: media.setMicrophoneDevice,
    setSpeakerDevice: media.setSpeakerDevice,
    bind: signaling.bind,
  }
}
