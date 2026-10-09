import { CloudflareSfuCallTransport } from '../transport/CloudflareSfuCallTransport'
import type {
  CallSession,
  CallsAck,
  WsCallsIncomingPayload,
  WsCallsSeatTakenPayload,
  WsRtcSignalPayload,
} from '~/types/api'
import type { PublicUserEntity } from '~/composables/useUsersStore'
import { createRingtone } from '../callRingtone'
import { reduceCallsIncoming, reduceCallsUpdated, remotePeerIds } from '../callSessionReducer'
import { CALL_RELOAD_KEY, type CallReloadMarker } from '../callReloadRecovery'
import { exitCallPictureInPicture } from '../callPictureInPicture'
import { peerSessionsOf, showIncomingCallNotification } from './callSignalingHelpers'
import { bindCallLifecycle } from './useCallLifecycleBinding'
import { callMediaLog } from '../callMediaLog'
import { SpeakingMonitor } from '../speakingDetector'
import type { CallTransportOptions } from '../transport/CallTransport'
import { MAX_PENDING_SIGNALS, hangupChime, localStream, remoteScreenStreams, remoteStreams, rt } from './callSessionRuntime'
import type { CallSessionStateContext } from './useCallSessionState'
import type { CallMediaContext } from './useCallMedia'
import type { CallReactionsContext } from './useCallReactions'

/**
 * Transport lifecycle and realtime: SFU transport creation/teardown, call acks, socket events,
 * reconnect/reload recovery, and tab lifecycle hooks. `bind()` wires it once per tab.
 */
export function useCallSignaling(
  s: CallSessionStateContext,
  media: CallMediaContext,
  reactionsApi: CallReactionsContext,
  inst: { outgoingMessageId: string | null },
  actions: {
    seedParticipants: (users: Array<Partial<PublicUserEntity> | null | undefined>) => void
    joinCall: (session: Pick<CallSession, 'id' | 'type'>, opts?: { resume?: CallReloadMarker }) => Promise<void>
  },
) {
  const {
    state,
    isMicEnabled,
    isCameraEnabled,
    peerStates,
    speakingIds,
    qualityTier,
    icePaths,
    speakerDeviceId,
    minimized,
    connectedAt,
    outgoingCalleeId,
    isScreenSharing,
    reactions,
    presence,
    toast,
    meId,
    phase,
    call,
    incoming,
  } = s
  const { localAudioTrack, localVideoTrack, localScreenTrack, releaseLocalMedia, restoreLocalTracks } = media
  const { ingestReaction, ensureReactionPrune, isGroupCall, selfHandRaised } = reactionsApi
  const { seedParticipants, joinCall } = actions
  // ─── Transport ──────────────────────────────────────────────────────────────

  function createTransport(callId: string) {
    rt.transport?.destroy()
    peerStates.value = {}
    remoteStreams.value = {}
    remoteScreenStreams.value = {}
    icePaths.value = {}
    qualityTier.value = 0
    rt.speakingMonitor?.destroy()
    rt.speakingMonitor = new SpeakingMonitor((levels) => {
      speakingIds.value = levels
    })
    rt.speakingMonitor.setStream(meId.value, localStream.value)
    rt.speakingMonitor.setMuted(meId.value, !isMicEnabled.value)
    const options: CallTransportOptions = {
        callId,
        selfUserId: meId.value,
        iceServers: rt.iceServers,
        reconnectGraceMs: rt.reconnectGraceMs,
        events: {
          onRemoteStream(userId, stream) {
            const next = { ...remoteStreams.value }
            if (stream) next[userId] = stream
            else delete next[userId]
            remoteStreams.value = next
            rt.speakingMonitor?.setStream(userId, stream)
          },
          onRemoteScreenStream(userId, stream) {
            const next = { ...remoteScreenStreams.value }
            if (stream) next[userId] = stream
            else delete next[userId]
            remoteScreenStreams.value = next
          },
          onPeerState(userId, s) {
            peerStates.value = { ...peerStates.value, [userId]: s }
            if (s === 'failed') onPeerFailed()
          },
          onData(userId, raw) {
            ingestReaction(userId, raw)
          },
          onIcePath(userId, path) {
            const next = { ...icePaths.value }
            if (path) next[userId] = path
            else delete next[userId]
            icePaths.value = next
          },
        },
      }
    const onTierChange = () => {
      qualityTier.value = (rt.transport as CloudflareSfuCallTransport | null)?.qualityManager.worstTier() ?? 0
    }
    rt.transport = new CloudflareSfuCallTransport(options, request => presence.emitCallsSfu(request), onTierChange)
    void rt.transport.setLocalTrack('audio', isMicEnabled.value ? localAudioTrack() : null)
    void rt.transport.setLocalTrack('video', isCameraEnabled.value ? localVideoTrack() : null)
    void rt.transport.setLocalTrack('screen', localScreenTrack())
    flushPendingSignals()
  }

  const shouldPlayHangupChime = (): boolean => phase.value === 'in_call' || phase.value === 'outgoing'
  const playHangupChime = () => hangupChime.play(speakerDeviceId.value)

  const clearReloadMarker = () => {
    try { window.sessionStorage.removeItem(CALL_RELOAD_KEY) } catch { /* Storage can be unavailable. */ }
  }

  function teardown() {
    rt.callAttempt += 1
    clearReloadMarker()
    stopRinging()
    rt.transport?.destroy()
    rt.transport = null
    rt.speakingMonitor?.destroy()
    rt.speakingMonitor = null
    releaseLocalMedia()
    remoteStreams.value = {}
    remoteScreenStreams.value = {}
    peerStates.value = {}
    speakingIds.value = {}
    icePaths.value = {}
    qualityTier.value = 0
    rt.pendingSignals = []
    rt.joiningCallId = null
    connectedAt.value = null
    outgoingCalleeId.value = null
    minimized.value = false
    isScreenSharing.value = false
    reactions.value = []
    if (rt.reactionPruneTimer) {
      clearInterval(rt.reactionPruneTimer)
      rt.reactionPruneTimer = null
    }
    clearSocketDownTimer()
  }

  function clearSocketDownTimer() {
    if (!rt.socketDownTimer) return
    clearTimeout(rt.socketDownTimer)
    rt.socketDownTimer = null
  }

  /** Unrecoverable mid-call: drop the session and tell the user once. */
  function connectionLost() {
    const current = call.value
    const chime = shouldPlayHangupChime()
    if (current) void presence.emitCallsLeave(current.id)
    teardown()
    state.value = { phase: 'idle', call: null, incoming: null }
    if (chime) playHangupChime()
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
    rt.incomingNotification?.close()
    rt.incomingNotification = null
    rt.ringtone?.stop()
    rt.ringtone = null
    rt.ringback?.stop()
    rt.ringback = null
  }

  function applyAck(ack: CallsAck): CallSession | null {
    if (ack.error || !ack.call) {
      toast.push({ title: ack.error?.message ?? 'Couldn’t connect the call.', tone: 'error' })
      return null
    }
    if (ack.call.mediaTransport !== 'sfu') {
      toast.push({ title: 'Calling is temporarily unavailable. Please try again later.', tone: 'error' })
      return null
    }
    if (ack.iceServers) rt.iceServers = ack.iceServers
    if (typeof ack.reconnectGraceMs === 'number' && ack.reconnectGraceMs > 0) rt.reconnectGraceMs = ack.reconnectGraceMs
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
    callMediaLog('enter-call', {
      callId: session.id,
      cameraEnabled: isCameraEnabled.value,
      micEnabled: isMicEnabled.value,
      remotes: remotePeerIds(session, meId.value),
    })
    rt.transport?.setPeers(remotePeerIds(session, meId.value))
    rt.transport?.syncPeerSessions(peerSessionsOf(session, meId.value))
    ensureReactionPrune()
  }

  // ─── Realtime ───────────────────────────────────────────────────────────────

  function onUpdated(session: CallSession) {
    if (session.status !== 'ended' && session.budgetWarningDeadline
      && call.value?.id === session.id && call.value.budgetWarningDeadline !== session.budgetWarningDeadline) {
      toast.push({ title: 'Call ending soon. Calling is temporarily unavailable.', durationMs: 10_000 })
    }
    const { state: next, effects } = reduceCallsUpdated(state.value, session, meId.value)
    state.value = next
    if (!isGroupCall(session) && selfHandRaised(session)) {
      presence.emitCallsState(session.id, { handRaised: false })
    }
    // A muted peer's tile must never ring, even if their analyser still hears room noise.
    for (const p of session.participants) {
      if (p.userId !== meId.value) rt.speakingMonitor?.setMuted(p.userId, !p.micEnabled)
    }
    for (const e of effects) {
      if (e.type === 'ended') {
        const chime = shouldPlayHangupChime()
        teardown()
        if (chime) playHangupChime()
        toast.push({ title: session.endReason === 'budget_exhausted' ? 'Call ended. Calling has reached its monthly allowance.' : e.reason === 'removed' ? 'You were disconnected from the call.' : 'Call ended.', durationMs: 3000 })
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
        rt.transport?.setPeers(e.userIds)
      }
    }
    if (next.phase === 'in_call' && next.call?.id === session.id) {
      rt.transport?.syncPeerSessions(peerSessionsOf(session, meId.value))
      // Self-heal the presenting flag: a Stop pressed while the socket was down (or a start
      // whose emit was lost) leaves everyone else on the wrong layout until we correct it.
      const mine = session.participants.find((p) => p.userId === meId.value)
      if (mine && Boolean(mine.screenSharing) !== isScreenSharing.value) {
        presence.emitCallsState(session.id, { screenSharing: isScreenSharing.value })
      }
    }
  }

  function onIncoming(payload: WsCallsIncomingPayload) {
    const next = reduceCallsIncoming(state.value, payload)
    if (next === state.value) return
    seedParticipants([payload.caller])
    state.value = next
    rt.ringtone = createRingtone('incoming')
    rt.ringtone.start()
    rt.incomingNotification = showIncomingCallNotification(payload) ?? rt.incomingNotification
  }

  function onSignal(payload: WsRtcSignalPayload) {
    const activeId = call.value?.id ?? rt.joiningCallId
    if (!activeId || payload.callId !== activeId) return
    if (!rt.transport) {
      if (rt.pendingSignals.length < MAX_PENDING_SIGNALS) rt.pendingSignals.push(payload)
      return
    }
    void rt.transport.handleSignal(payload)
  }

  function flushPendingSignals() {
    if (!rt.transport || rt.pendingSignals.length === 0) return
    const queued = rt.pendingSignals.splice(0)
    for (const s of queued) void rt.transport.handleSignal(s)
  }

  /**
   * Socket came back while this tab was ringing: the `calls:updated` saying it was answered on
   * another device (or cancelled) may have gone out while we were offline. Ask once.
   */
  async function resyncRingingCall() {
    const ringing = incoming.value?.call
    if (phase.value !== 'incoming' || !ringing) return
    const ack = await presence.emitCallsStatus(ringing.id)
    if (phase.value !== 'incoming' || incoming.value?.call.id !== ringing.id) return
    if (ack.call) {
      onUpdated(ack.call)
      return
    }
    const code = ack.error?.code
    if (code === 'call_ended' || code === 'call_not_found') {
      stopRinging()
      state.value = { phase: 'idle', call: null, incoming: null }
    }
  }

  /** Socket came back mid-call: re-bind this tab to its seat before the server's grace expires. */
  async function rejoinAfterReconnect() {
    const current = call.value
    if (!current || (phase.value !== 'in_call' && phase.value !== 'outgoing')) return
    const ack = await presence.emitCallsJoin(current.id)
    if (ack.call) {
      state.value = { ...state.value, call: ack.call }
      rt.transport?.setPeers(remotePeerIds(ack.call, meId.value))
      rt.transport?.syncPeerSessions(peerSessionsOf(ack.call, meId.value))
      rt.transport?.resumeConnections()
      // Changes made while offline never reached the server; republish what this tab really has.
      presence.emitCallsState(ack.call.id, {
        micEnabled: isMicEnabled.value,
        cameraEnabled: isCameraEnabled.value,
        screenSharing: isScreenSharing.value,
      })
      return
    }
    const code = ack.error?.code
    if (code === 'call_not_found' || code === 'call_ended' || code === 'client_update_required' || code === 'calling_unavailable' || code === 'budget_exhausted') {
      const chime = shouldPlayHangupChime()
      teardown()
      state.value = { phase: 'idle', call: null, incoming: null }
      if (chime) playHangupChime()
      toast.push({ title: ack.error?.message ?? 'Call ended.', durationMs: 3000 })
    }
  }

  async function resumeAfterForeground() {
    if (phase.value !== 'in_call' && phase.value !== 'outgoing') return
    await exitCallPictureInPicture()
    await restoreLocalTracks()
    rt.transport?.resumeConnections()
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
    if (!import.meta.client || rt.unbind) return rt.unbind ?? (() => {})
    return bindCallLifecycle({
      s, media, inst, joinCall,
      handlers: { onIncoming, onUpdated, onSignal, onSeatTaken },
      clearReloadMarker, clearSocketDownTimer, connectionLost,
      rejoinAfterReconnect, resyncRingingCall, resumeAfterForeground,
    })
  }

  return {
    createTransport,
    shouldPlayHangupChime,
    playHangupChime,
    clearReloadMarker,
    teardown,
    stopRinging,
    applyAck,
    enterCall,
    bind,
  }
}
