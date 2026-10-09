import type { CallSession, WsCallsIncomingPayload, WsCallsSeatTakenPayload, WsRtcSignalPayload, Message } from '~/types/api'
import type { CallsCallback, MessagesCallback } from '~/composables/usePresence'
import { enterCallPictureInPicture, exitCallPictureInPicture } from '../callPictureInPicture'
import { CALL_RELOAD_KEY, readCallReloadMarker, canResumeCallSeat, type CallReloadMarker } from '../callReloadRecovery'
import { tabCallSessionId } from '../callSessionId'
import { localStream, rt } from './callSessionRuntime'
import type { CallSessionStateContext } from './useCallSessionState'
import type { CallMediaContext } from './useCallMedia'

export interface CallLifecycleDeps {
  s: CallSessionStateContext
  media: CallMediaContext
  inst: { outgoingMessageId: string | null }
  joinCall: (session: Pick<CallSession, 'id' | 'type'>, opts?: { resume?: CallReloadMarker }) => Promise<void>
  handlers: {
    onIncoming: (payload: WsCallsIncomingPayload) => void
    onUpdated: (session: CallSession) => void
    onSignal: (payload: WsRtcSignalPayload) => void
    onSeatTaken: (payload: WsCallsSeatTakenPayload) => void
  }
  clearReloadMarker: () => void
  clearSocketDownTimer: () => void
  connectionLost: () => void
  rejoinAfterReconnect: () => Promise<void>
  resyncRingingCall: () => Promise<void>
  resumeAfterForeground: () => Promise<void>
}

/**
 * Wires realtime callbacks and tab lifecycle (reload recovery, reconnect, PiP, visibility) for the
 * call session. Returns the unbind function; the caller guards against double-binding.
 */
export function bindCallLifecycle(deps: CallLifecycleDeps): () => void {
  const { s, media, inst, joinCall, handlers, clearReloadMarker, clearSocketDownTimer, connectionLost, rejoinAfterReconnect, resyncRingingCall, resumeAfterForeground } = deps
  const { isMicEnabled, isCameraEnabled, minimized, pendingVoicemail, isScreenSharing, presence, router, meId, phase, call, isEngaged } = s
  const { otherPresenterId, stopScreenShare } = media

    const cb: CallsCallback = {
      onIncoming: (p) => handlers.onIncoming(p),
      onUpdated: (p) => handlers.onUpdated(p.call),
      onSignal: (p) => handlers.onSignal(p),
      onSeatTaken: (p) => handlers.onSeatTaken(p),
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
