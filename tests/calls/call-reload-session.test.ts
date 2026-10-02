import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, onMounted } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { CALL_RELOAD_KEY } from '~/composables/calls/callReloadRecovery'
import { useCallSession } from '~/composables/calls/useCallSession'

const reloadSpies = vi.hoisted(() => ({
  join: vi.fn(), status: vi.fn(), leave: vi.fn(), media: vi.fn(), state: vi.fn(), toast: vi.fn(),
  onCalls: vi.fn(), socket: { value: true }, user: { value: { id: 'alice' } },
}))
mockNuxtImport('useAuth', () => () => ({ user: reloadSpies.user }))
mockNuxtImport('useAppToast', () => () => ({ push: reloadSpies.toast }))
mockNuxtImport('usePresence', () => () => ({
  isSocketConnected: reloadSpies.socket, emitCallsJoin: reloadSpies.join, emitCallsStatus: reloadSpies.status,
  emitCallsLeave: reloadSpies.leave, emitCallsState: reloadSpies.state, addCallsCallback: reloadSpies.onCalls,
  removeCallsCallback: vi.fn(), addMessagesCallback: vi.fn(), removeMessagesCallback: vi.fn(),
  emitCallsSfu: vi.fn(),
}))
vi.mock('~/composables/calls/useCallDevices', () => ({
  acquireCallMedia: reloadSpies.media, acquireAudioTrack: vi.fn(), acquireVideoTrack: vi.fn(),
  canScreenShare: () => false, shouldStartCallWithCamera: () => false, stopTrack: vi.fn(),
}))
vi.mock('~/composables/calls/transport/CloudflareSfuCallTransport', () => ({
  CloudflareSfuCallTransport: class {
    qualityManager = { worstTier: () => 0 }
    destroy() {} setLocalTrack() { return Promise.resolve() } setPeers() {} syncPeerSessions() {} resumeConnections() {}
  },
}))
vi.mock('~/composables/calls/speakingDetector', () => ({
  SpeakingMonitor: class { setStream() {} setMuted() {} destroy() {} },
}))
vi.mock('~/composables/calls/callHangupSound', () => ({ createHangupChime: () => ({ play() {} }) }))
vi.mock('~/composables/calls/callReactionSound', () => ({ createReactionBlip: () => ({ play() {} }) }))

const baseCall = {
  id: 'reload-call', type: 'video', status: 'active', mediaTransport: 'sfu', conversationId: 'conversation',
  participants: [{ userId: 'alice', sessionId: 'web-original-tab' }, { userId: 'bob', sessionId: 'web-other-tab' }],
}
let session: ReturnType<typeof useCallSession>
let unbind: (() => void) | undefined
let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined
const host = defineComponent({ setup() { session = useCallSession(); onMounted(() => { unbind = session.bind() }); return () => h('div') } })
function remember() {
  sessionStorage.setItem(CALL_RELOAD_KEY, JSON.stringify({
    userId: 'alice', callId: baseCall.id, sessionId: 'web-original-tab', expiresAt: Date.now() + 30_000,
    micEnabled: false, cameraEnabled: true,
  }))
}
beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.spyOn(performance, 'getEntriesByType').mockReturnValue([{ type: 'reload' }] as PerformanceNavigationTiming[])
  reloadSpies.status.mockResolvedValue({ call: baseCall })
  reloadSpies.join.mockResolvedValue({ call: baseCall, iceServers: [], reconnectGraceMs: 30_000 })
  reloadSpies.leave.mockResolvedValue({})
  reloadSpies.media.mockResolvedValue({ stream: null, audioTrack: null, videoTrack: { id: 'camera' }, micError: null, cameraError: null })
})
afterEach(async () => {
  unbind?.(); unbind = undefined
  if (session) await session.leaveCall()
  wrapper?.unmount(); wrapper = undefined
  vi.restoreAllMocks()
})

describe('browser reload call lifecycle', () => {
  it('rejoins the original seat with its media choices, never auto-restores screen sharing, and unload does not leave', async () => {
    remember()
    wrapper = await mountSuspended(host)
    await flushPromises()
    await nextTick()
    expect(reloadSpies.join).toHaveBeenCalledWith('reload-call', 'web-original-tab')
    expect(reloadSpies.media).toHaveBeenCalledWith({ audio: false, video: true })
    expect(session.phase.value).toBe('in_call')
    expect(session.isMicEnabled.value).toBe(false)
    expect(session.isScreenSharing.value).toBe(false)
    window.dispatchEvent(new Event('beforeunload'))
    window.dispatchEvent(new Event('pagehide'))
    expect(reloadSpies.leave).not.toHaveBeenCalled()
    expect(JSON.parse(sessionStorage.getItem(CALL_RELOAD_KEY)!)).toMatchObject({ callId: 'reload-call', micEnabled: false })
    await session.leaveCall()
    expect(reloadSpies.leave).toHaveBeenCalledWith('reload-call')
    expect(sessionStorage.getItem(CALL_RELOAD_KEY)).toBeNull()
  })

  it('does not auto-join when a new tab copied sessionStorage', async () => {
    vi.mocked(performance.getEntriesByType).mockReturnValue([{ type: 'navigate' }] as PerformanceNavigationTiming[])
    remember()
    wrapper = await mountSuspended(host)
    await flushPromises()
    expect(reloadSpies.status).not.toHaveBeenCalled()
    expect(reloadSpies.join).not.toHaveBeenCalled()
  })

  it('does not open media or reclaim a seat that moved to another device', async () => {
    remember()
    reloadSpies.status.mockResolvedValue({ call: { ...baseCall, participants: [{ userId: 'alice', sessionId: 'phone-session' }] } })
    wrapper = await mountSuspended(host)
    await flushPromises()
    expect(reloadSpies.media).not.toHaveBeenCalled()
    expect(reloadSpies.join).not.toHaveBeenCalled()
  })
})
