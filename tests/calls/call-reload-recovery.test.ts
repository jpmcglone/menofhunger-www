import { beforeEach, describe, expect, it } from 'vitest'
import { CALL_RELOAD_KEY, readCallReloadMarker, canResumeCallSeat, type CallReloadMarker } from '~/composables/calls/callReloadRecovery'
import type { CallSession } from '~/types/api'

const marker: CallReloadMarker = { userId: 'alice', callId: 'call-1', sessionId: 'web-previous-tab', expiresAt: 31_000, micEnabled: false, cameraEnabled: true }
const session = (sessionId = marker.sessionId, status = 'active') => ({ id: marker.callId, mediaTransport: 'sfu', status, participants: [{ userId: 'alice', sessionId }] }) as CallSession
beforeEach(() => sessionStorage.clear())

describe('reload call intent', () => {
  it('preserves a muted microphone and enabled camera for the same account during grace', () => {
    sessionStorage.setItem(CALL_RELOAD_KEY, JSON.stringify(marker))
    expect(readCallReloadMarker(sessionStorage, 'alice', 1000)).toEqual(marker)
  })
  it.each([['alice', 31_000], ['bob', 1000]] as const)('rejects expired or different-account intent (%s)', (userId, now) => {
    sessionStorage.setItem(CALL_RELOAD_KEY, JSON.stringify(marker))
    expect(readCallReloadMarker(sessionStorage, userId, now)).toBeNull()
    expect(sessionStorage.getItem(CALL_RELOAD_KEY)).toBeNull()
  })
  it('does not accept unbounded or malformed storage', () => {
    for (const raw of ['broken', JSON.stringify({ ...marker, expiresAt: 999_999 }), JSON.stringify({ ...marker, micEnabled: 'yes' })]) {
      sessionStorage.setItem(CALL_RELOAD_KEY, raw)
      expect(readCallReloadMarker(sessionStorage, 'alice', 1000)).toBeNull()
    }
  })
  it('requires a live server seat with the original identity', () => {
    expect(canResumeCallSeat(session(), marker)).toBe(true)
    expect(canResumeCallSeat(session('web-another-device'), marker)).toBe(false)
    expect(canResumeCallSeat(session(marker.sessionId, 'ended'), marker)).toBe(false)
    expect(canResumeCallSeat({ ...session(), participants: [] }, marker)).toBe(false)
    expect(canResumeCallSeat(undefined, marker)).toBe(false)
  })
})
