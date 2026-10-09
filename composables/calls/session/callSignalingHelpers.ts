import type { CallSession, WsCallsIncomingPayload } from '~/types/api'

/** Remote participants' transport session ids, keyed by user id. */
export function peerSessionsOf(session: CallSession, selfUserId: string): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  for (const p of session.participants) {
    if (p.userId !== selfUserId) out[p.userId] = p.sessionId ?? null
  }
  return out
}

/** OS notification for an incoming call while the tab is hidden; null when not shown. */
export function showIncomingCallNotification(payload: WsCallsIncomingPayload): Notification | null {
  if (!import.meta.client || typeof Notification === 'undefined') return null
  if (document.visibilityState === 'visible') return null
  if (Notification.permission !== 'granted') return null
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
    return n
  } catch {
    // Notifications unavailable in this context.
    return null
  }
}
