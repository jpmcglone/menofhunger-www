import type { CallSession } from '~/types/api'

export const CALL_RELOAD_KEY = 'moh:call-reload:v1'
export type CallReloadMarker = {
  userId: string
  callId: string
  sessionId: string
  expiresAt: number
  micEnabled: boolean
  cameraEnabled: boolean
}

/** Tab-local, short-lived intent only. The server remains authoritative for membership and seat ownership. */
export function readCallReloadMarker(storage: Pick<Storage, 'getItem' | 'removeItem'>, userId: string, now = Date.now()): CallReloadMarker | null {
  try {
    const raw: unknown = JSON.parse(storage.getItem(CALL_RELOAD_KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return null
    const value = raw as Partial<CallReloadMarker>
    if (value.userId !== userId || typeof value.callId !== 'string' || !value.callId
      || typeof value.sessionId !== 'string' || !/^[A-Za-z0-9_-]{8,64}$/.test(value.sessionId)
      || typeof value.expiresAt !== 'number' || value.expiresAt <= now || value.expiresAt > now + 60_000
      || typeof value.micEnabled !== 'boolean' || typeof value.cameraEnabled !== 'boolean') {
      storage.removeItem(CALL_RELOAD_KEY)
      return null
    }
    return value as CallReloadMarker
  } catch { return null }
}

export function canResumeCallSeat(call: CallSession | null | undefined, marker: CallReloadMarker): boolean {
  return Boolean(call && call.id === marker.callId && call.status !== 'ended' && call.mediaTransport === 'sfu'
    && call.participants.some(p => p.userId === marker.userId && p.sessionId === marker.sessionId))
}
