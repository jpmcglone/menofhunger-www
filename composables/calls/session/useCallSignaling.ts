import { CloudflareSfuCallTransport } from '../transport/CloudflareSfuCallTransport'
import type {
  CallSession,
  CallsAck,
  Message,
  WsCallsIncomingPayload,
  WsCallsSeatTakenPayload,
  WsRtcSignalPayload,
} from '~/types/api'
import type { CallsCallback, MessagesCallback } from '~/composables/usePresence'
import type { PublicUserEntity } from '~/composables/useUsersStore'
import { createRingtone } from '../callRingtone'
import { reduceCallsIncoming, reduceCallsUpdated, remotePeerIds } from '../callSessionReducer'
import { CALL_RELOAD_KEY, readCallReloadMarker, canResumeCallSeat, type CallReloadMarker } from '../callReloadRecovery'
import { tabCallSessionId } from '../callSessionId'
import { enterCallPictureInPicture, exitCallPictureInPicture } from '../callPictureInPicture'
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
    pendingVoicemail,
    outgoingCalleeId,
    isScreenSharing,
    reactions,
    presence,
    toast,
    router,
    meId,
    phase,
    call,
    incoming,
    isEngaged,
  } = s
  const { localAudioTrack, localVideoTrack, localScreenTrack, releaseLocalMedia, otherPresenterId, stopScreenShare, restoreLocalTracks } = media
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

  function shouldPlayHangupChime(): boolean {
    return phase.value === 'in_call' || phase.value === 'outgoing'
  }

  function playHangupChime() {
    hangupChime.play(speakerDeviceId.value)
  }

  function clearReloadMarker() {
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
    rt.transport?.syncPeerSessions(peerSessionsOf(session))
    ensureReactionPrune()
  }

  function peerSessionsOf(session: CallSession): Record<string, string | null> {
    const out: Record<string, string | null> = {}
    for (const p of session.participants) {
      if (p.userId !== meId.value) out[p.userId] = p.sessionId ?? null
    }
    return out
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
      rt.transport?.syncPeerSessions(peerSessionsOf(session))
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
    notifyIfHidden(payload)
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
      rt.incomingNotification = n
    } catch {
      // Notifications unavailable in this context.
    }
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
      rt.transport?.syncPeerSessions(peerSessionsOf(ack.call))
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
        if (!message || message.id !== inst.outgoingMessageId) return
        if (message.kind !== 'call' || message.call?.outcome !== 'missed') return
        if (message.media?.length) return
        pendingVoicemail.value = { conversationId: payload.conversationId ?? message.conversationId, messageId: message.id }
      },
    }
    presence.addMessagesCallback(messagesCb)

    // Reload and close share lifecycle events. Neither is an explicit Hang Up.
    // Let the server hold the seat for its bounded reconnect grace instead.
    const rememberCall = () => {
      const current = call.value
      if (!current || (phase.value !== 'in_call' && phase.value !== 'outgoing')) return
      const marker: CallReloadMarker = {
        userId: meId.value, callId: current.id, sessionId: tabCallSessionId(),
        expiresAt: Date.now() + rt.reconnectGraceMs,
        micEnabled: isMicEnabled.value, cameraEnabled: isCameraEnabled.value,
      }
      try { window.sessionStorage.setItem(CALL_RELOAD_KEY, JSON.stringify(marker)) } catch { /* Best effort. */ }
    }
    window.addEventListener('pagehide', rememberCall)
    window.addEventListener('beforeunload', rememberCall)

    // sessionStorage can be copied into a newly opened tab. Only a real reload may auto-rejoin.
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    let restorePending = navigation?.type === 'reload'
    if (!restorePending) clearReloadMarker()
    let restoring = false
    let restoreTimer: ReturnType<typeof setTimeout> | null = null
    const restoreReloadedCall = async () => {
      if (!restorePending || restoring || !meId.value || !presence.isSocketConnected.value) return
      if (phase.value !== 'idle' && phase.value !== 'in_call_elsewhere') return
      let marker: CallReloadMarker | null = null
      try { marker = readCallReloadMarker(window.sessionStorage, meId.value) } catch { /* Storage can be disabled. */ }
      if (!marker) { restorePending = false; return }
      restoring = true
      try {
        const ack = await presence.emitCallsStatus(marker.callId)
        if (!restorePending || meId.value !== marker.userId) return
        if (!ack.call && (!ack.error || ['invalid_payload', 'not_authenticated'].includes(ack.error.code))) {
          restoreTimer = setTimeout(() => { restoreTimer = null; void restoreReloadedCall() }, 1000)
          return
        }
        restorePending = false
        if (!canResumeCallSeat(ack.call, marker) || marker.expiresAt <= Date.now()) { clearReloadMarker(); return }
        await joinCall(ack.call!, { resume: marker })
      } finally { restoring = false }
    }
    const stopReloadWatch = watch([meId, () => presence.isSocketConnected.value], () => {
      void restoreReloadedCall()
    }, { immediate: true })

    const stopReconnectWatch = watch(
      () => presence.isSocketConnected.value,
      (connected, was) => {
        if (connected) {
          clearSocketDownTimer()
          if (was === false) {
            void rejoinAfterReconnect()
            void resyncRingingCall()
          }
          return
        }
        // The server drops our seat after `rt.reconnectGraceMs`; stop spinning at the same moment.
        if (!isEngaged.value || rt.socketDownTimer) return
        rt.socketDownTimer = setTimeout(() => {
          rt.socketDownTimer = null
          if (!presence.isSocketConnected.value && isEngaged.value) connectionLost()
        }, rt.reconnectGraceMs)
      },
    )

    // Network came back (Wi-Fi ↔ hotspot, VPN toggle): don't wait for ICE to time out.
    const onOnline = () => {
      if (phase.value === 'in_call') rt.transport?.resumeConnections()
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
    // Coming back to the window (not only the tab) brings the video home from PiP.
    const onFocus = () => {
      if (document.visibilityState === 'visible' && isEngaged.value) void exitCallPictureInPicture()
    }
    window.addEventListener('focus', onFocus)

    const stopRouteHook = router.afterEach(() => {
      if (phase.value === 'in_call' || phase.value === 'outgoing') minimized.value = true
    })

    // The local MediaStream object is replaced on every mic/camera swap; re-tap it each time.
    const stopLocalSpeakingWatch = watch([localStream, isMicEnabled], ([stream, micOn]) => {
      rt.speakingMonitor?.setStream(meId.value, stream)
      rt.speakingMonitor?.setMuted(meId.value, !micOn)
    })

    const stopPresenterWatch = watch(
      () => call.value?.participants,
      () => {
        if (isScreenSharing.value && otherPresenterId()) void stopScreenShare()
      },
    )

    rt.unbind = () => {
      stopPresenterWatch()
      stopLocalSpeakingWatch()
      presence.removeCallsCallback(cb)
      presence.removeMessagesCallback(messagesCb)
      restorePending = false
      stopReloadWatch()
      if (restoreTimer) clearTimeout(restoreTimer)
      window.removeEventListener('pagehide', rememberCall)
      window.removeEventListener('beforeunload', rememberCall)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
      stopReconnectWatch()
      stopRouteHook()
      clearSocketDownTimer()
      rt.unbind = null
    }
    return rt.unbind
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
