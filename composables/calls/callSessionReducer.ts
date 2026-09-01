import type { CallSession, WsCallsIncomingPayload } from '~/types/api'

/**
 * idle              nothing going on in this tab
 * requesting_media  permissions prompt is up (start/accept/join was clicked)
 * outgoing          direct call, we started it, callee hasn't answered
 * incoming          direct call ringing us
 * joining           calls:start / calls:join in flight for an active call
 * in_call           connected (or reconnecting) with media flowing
 * in_call_elsewhere another tab/device of ours is in this call
 */
export type CallPhase = 'idle' | 'requesting_media' | 'outgoing' | 'incoming' | 'joining' | 'in_call' | 'in_call_elsewhere'

export type CallSessionState = {
  phase: CallPhase
  /** The call this tab is engaged with (outgoing / joining / in_call / in_call_elsewhere). */
  call: CallSession | null
  /** The direct call ringing this tab. */
  incoming: WsCallsIncomingPayload | null
}

export type CallReducerEffect =
  | { type: 'ended'; reason: 'ended' | 'removed' }
  | { type: 'dismiss_incoming' }
  | { type: 'peers'; userIds: string[] }
  | { type: 'connected' }

export type CallReducerResult = {
  state: CallSessionState
  effects: CallReducerEffect[]
}

export function isParticipant(call: CallSession, userId: string): boolean {
  return call.participants.some((p) => p.userId === userId)
}

export function remotePeerIds(call: CallSession, selfUserId: string): string[] {
  return call.participants.filter((p) => p.userId !== selfUserId).map((p) => p.userId)
}

/**
 * Pure `calls:updated` reducer. Idempotent: re-applying the same payload yields the same
 * state and (apart from peer reconcile, which the transport de-dupes) no new effects.
 */
export function reduceCallsUpdated(state: CallSessionState, call: CallSession, selfUserId: string): CallReducerResult {
  const effects: CallReducerEffect[] = []
  const meIn = isParticipant(call, selfUserId)

  // ── The call this tab is engaged with ──
  if (state.call && state.call.id === call.id) {
    if (state.phase === 'in_call_elsewhere') {
      if (call.status === 'ended' || !meIn) {
        return { state: { ...state, phase: 'idle', call: null }, effects }
      }
      return { state: { ...state, call }, effects }
    }

    if (call.status === 'ended') {
      effects.push({ type: 'ended', reason: 'ended' })
      return { state: { ...state, phase: 'idle', call: null }, effects }
    }

    // Grace expired server-side while this tab still thought it was connected.
    if ((state.phase === 'in_call' || state.phase === 'outgoing') && !meIn) {
      effects.push({ type: 'ended', reason: 'removed' })
      return { state: { ...state, phase: 'idle', call: null }, effects }
    }

    let phase = state.phase
    if (phase === 'outgoing' && call.status === 'active' && call.participants.length >= 2) {
      phase = 'in_call'
      effects.push({ type: 'connected' })
    }
    if (phase === 'in_call' || phase === 'outgoing') {
      effects.push({ type: 'peers', userIds: remotePeerIds(call, selfUserId) })
    }
    return { state: { ...state, phase, call }, effects }
  }

  // ── A ring we're showing ──
  if (state.incoming && state.incoming.call.id === call.id) {
    if (call.status === 'ended') {
      effects.push({ type: 'dismiss_incoming' })
      return { state: { ...state, phase: 'idle', incoming: null }, effects }
    }
    if (meIn) {
      // Accepted from another tab/device.
      effects.push({ type: 'dismiss_incoming' })
      return { state: { ...state, phase: 'in_call_elsewhere', incoming: null, call }, effects }
    }
    return { state, effects }
  }

  // ── Start/join in flight: the ack carries the authoritative session; ignore until then ──
  if (state.phase === 'requesting_media' || state.phase === 'joining' || (state.phase === 'outgoing' && !state.call)) {
    return { state, effects }
  }

  // ── Not engaged: is another one of our tabs in this call? ──
  if (state.phase === 'idle' && meIn && call.status !== 'ended') {
    return { state: { ...state, phase: 'in_call_elsewhere', call }, effects }
  }

  return { state, effects }
}

/** `calls:incoming`: only ring when this tab is free. Busy tabs stay quiet; other tabs still ring. */
export function reduceCallsIncoming(state: CallSessionState, payload: WsCallsIncomingPayload): CallSessionState {
  if (state.phase !== 'idle') return state
  return { ...state, phase: 'incoming', incoming: payload }
}
