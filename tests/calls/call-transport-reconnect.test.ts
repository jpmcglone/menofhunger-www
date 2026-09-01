import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PeerMediaState } from '~/composables/calls/transport/CallTransport'
import { DEFAULT_RECONNECT_GRACE_MS, PeerToPeerCallTransport } from '~/composables/calls/transport/PeerToPeerCallTransport'

/** Just enough RTCPeerConnection for the transport's state machine; no media, no network. */
class FakePeerConnection {
  static instances: FakePeerConnection[] = []
  iceConnectionState = 'new'
  connectionState = 'new'
  signalingState = 'stable'
  localDescription: unknown = null
  remoteDescription: unknown = null
  restartIce = vi.fn()
  close = vi.fn()
  onnegotiationneeded: (() => void) | null = null
  onicecandidate: ((e: unknown) => void) | null = null
  ontrack: ((e: unknown) => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  onconnectionstatechange: (() => void) | null = null

  constructor() {
    FakePeerConnection.instances.push(this)
  }

  addTransceiver() {
    return {
      sender: {
        replaceTrack: vi.fn(async () => undefined),
        getParameters: () => ({ encodings: [{}] }),
        setParameters: vi.fn(async () => undefined),
        track: null,
      },
    }
  }
  getSenders() {
    return []
  }
  async getStats() {
    return new Map()
  }
  async setLocalDescription() {}
  async setRemoteDescription() {}
  async addIceCandidate() {}

  ice(state: string) {
    this.iceConnectionState = state
    this.oniceconnectionstatechange?.()
  }
}

class FakeMediaStream {
  private tracks: MediaStreamTrack[]
  constructor(tracks: MediaStreamTrack[] = []) {
    this.tracks = [...tracks]
  }
  getTracks() {
    return this.tracks
  }
  addTrack(t: MediaStreamTrack) {
    this.tracks.push(t)
  }
  removeTrack(t: MediaStreamTrack) {
    this.tracks = this.tracks.filter((x) => x !== t)
  }
}

function makeTransport(opts?: { reconnectGraceMs?: number; selfUserId?: string }) {
  const states: Array<[string, PeerMediaState]> = []
  const streams: Array<[string, MediaStream | null]> = []
  const sendSignal = vi.fn()
  const transport = new PeerToPeerCallTransport({
    callId: 'call-1',
    // 'zed' > every peer id below, so this side is impolite and owns ICE restarts.
    selfUserId: opts?.selfUserId ?? 'zed',
    iceServers: [],
    sendSignal,
    reconnectGraceMs: opts?.reconnectGraceMs,
    events: {
      onRemoteStream: (userId, s) => streams.push([userId, s]),
      onPeerState: (userId, s) => states.push([userId, s]),
    },
  })
  return { transport, states, streams, sendSignal }
}

const lastState = (states: Array<[string, PeerMediaState]>, userId: string) =>
  states.filter(([id]) => id === userId).at(-1)?.[1]

describe('PeerToPeerCallTransport reconnect alignment', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakePeerConnection.instances = []
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection)
    vi.stubGlobal('MediaStream', FakeMediaStream)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('emits a new stream object per arriving track so bound <video> elements re-attach', () => {
    const { transport, streams } = makeTransport()
    transport.setPeers(['alice'])
    const pc = FakePeerConnection.instances[0]!
    const initial = streams.at(-1)![1]
    expect(initial?.getTracks()).toHaveLength(0)

    const audio = { id: 'a1', kind: 'audio' } as unknown as MediaStreamTrack
    const video = { id: 'v1', kind: 'video' } as unknown as MediaStreamTrack
    pc.ontrack?.({ track: audio })
    pc.ontrack?.({ track: video })
    // Duplicate delivery of a known track is a no-op.
    pc.ontrack?.({ track: video })

    const alice = streams.filter(([id]) => id === 'alice').map(([, s]) => s)
    expect(alice).toHaveLength(3)
    expect(alice[1]).not.toBe(initial)
    expect(alice[2]).not.toBe(alice[1])
    expect(alice[2]?.getTracks().map((t) => t.id)).toEqual(['a1', 'v1'])
    transport.destroy()
  })

  it('marks a peer failed once, exactly when the server grace window elapses', () => {
    const { transport, states } = makeTransport({ reconnectGraceMs: 10_000 })
    transport.setPeers(['alice'])
    const pc = FakePeerConnection.instances[0]!
    pc.ice('connected')
    pc.ice('disconnected')
    expect(lastState(states, 'alice')).toBe('reconnecting')

    vi.advanceTimersByTime(9_999)
    expect(lastState(states, 'alice')).toBe('reconnecting')
    vi.advanceTimersByTime(1)
    expect(lastState(states, 'alice')).toBe('failed')

    // Later ICE churn on a failed peer is ignored: no flapping back to reconnecting.
    pc.ice('disconnected')
    pc.ice('failed')
    expect(states.filter(([, s]) => s === 'failed')).toHaveLength(1)
    expect(lastState(states, 'alice')).toBe('failed')
    transport.destroy()
  })

  it('recovering before the window clears the timer so it never fires', () => {
    const { transport, states } = makeTransport({ reconnectGraceMs: 10_000 })
    transport.setPeers(['alice'])
    const pc = FakePeerConnection.instances[0]!
    pc.ice('connected')
    pc.ice('disconnected')
    vi.advanceTimersByTime(5_000)
    pc.ice('connected')
    expect(lastState(states, 'alice')).toBe('connected')
    vi.advanceTimersByTime(60_000)
    expect(states.some(([, s]) => s === 'failed')).toBe(false)
    transport.destroy()
  })

  it('falls back to the server default when the ack omitted reconnectGraceMs', () => {
    const { transport, states } = makeTransport()
    transport.setPeers(['alice'])
    FakePeerConnection.instances[0]!.ice('disconnected')
    vi.advanceTimersByTime(DEFAULT_RECONNECT_GRACE_MS - 1)
    expect(lastState(states, 'alice')).toBe('reconnecting')
    vi.advanceTimersByTime(1)
    expect(lastState(states, 'alice')).toBe('failed')
    transport.destroy()
  })

  it('restartIce() kicks only unhealthy peers, and only from the impolite side', () => {
    const { transport } = makeTransport()
    transport.setPeers(['alice', 'bob'])
    const [alice, bob] = FakePeerConnection.instances as [FakePeerConnection, FakePeerConnection]
    alice.ice('connected')
    bob.ice('disconnected') // reconnecting; the 3s disconnected timer hasn't fired yet
    bob.restartIce.mockClear()

    transport.restartIce()
    expect(alice.restartIce).not.toHaveBeenCalled()
    expect(bob.restartIce).toHaveBeenCalledTimes(1)
    transport.destroy()

    // Polite side ('aaa' < 'alice') must never restart, even when asked.
    const polite = makeTransport({ selfUserId: 'aaa' })
    polite.transport.setPeers(['alice'])
    const pc = FakePeerConnection.instances.at(-1)!
    pc.ice('disconnected')
    polite.transport.restartIce()
    expect(pc.restartIce).not.toHaveBeenCalled()
    polite.transport.destroy()
  })

  it('destroy() clears pending give-up timers', () => {
    const { transport, states } = makeTransport({ reconnectGraceMs: 1_000 })
    transport.setPeers(['alice'])
    FakePeerConnection.instances[0]!.ice('disconnected')
    transport.destroy()
    vi.advanceTimersByTime(5_000)
    expect(states.some(([, s]) => s === 'failed')).toBe(false)
  })
})
