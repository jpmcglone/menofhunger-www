import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PeerMediaState } from '~/composables/calls/transport/CallTransport'
import {
  CONNECTING_RESTART_MS,
  DEFAULT_RECONNECT_GRACE_MS,
  PeerToPeerCallTransport,
} from '~/composables/calls/transport/PeerToPeerCallTransport'

/** Just enough RTCPeerConnection for the transport's state machine; no media, no network. */
class FakePeerConnection {
  static instances: FakePeerConnection[] = []
  iceConnectionState = 'new'
  connectionState = 'new'
  signalingState = 'stable'
  localDescription: unknown = null
  remoteDescription: unknown = null
  transceivers: Array<{ sender: unknown; receiver: { track: Record<string, unknown> } }> = []
  setLocalCalls: Array<{ type: string; sdp?: string } | undefined> = []
  restartIce = vi.fn()
  close = vi.fn()
  onnegotiationneeded: (() => void) | null = null
  onicecandidate: ((e: unknown) => void) | null = null
  ontrack: ((e: unknown) => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  onconnectionstatechange: (() => void) | null = null
  ondatachannel: ((e: { channel: FakeDataChannel }) => void) | null = null
  createdChannels: FakeDataChannel[] = []

  constructor() {
    FakePeerConnection.instances.push(this)
  }

  createDataChannel(label: string) {
    const ch = new FakeDataChannel(label)
    this.createdChannels.push(ch)
    return ch
  }

  addTransceiver(kind?: string) {
    const t = {
      sender: {
        replaceTrack: vi.fn(async () => undefined),
        getParameters: () => ({ encodings: [{}] }),
        setParameters: vi.fn(async () => undefined),
        track: null,
      },
      receiver: {
        track: {
          id: `${kind ?? 'video'}-recv`,
          kind: kind === 'audio' ? 'audio' : 'video',
          enabled: true,
          muted: true,
          readyState: 'live',
        },
      },
    }
    this.transceivers.push(t)
    return t
  }
  getTransceivers() {
    return this.transceivers
  }
  getSenders() {
    return []
  }
  async getStats() {
    return new Map()
  }
  async setLocalDescription(desc?: { type: string; sdp: string }) {
    this.setLocalCalls.push(desc)
    if (desc?.type === 'rollback') {
      this.localDescription = null
      this.signalingState = 'stable'
      return
    }
    const implicitType = this.signalingState === 'have-remote-offer' ? 'answer' : 'offer'
    this.localDescription = desc ?? { type: implicitType, sdp: 'local' }
    this.signalingState = 'stable'
  }
  async setRemoteDescription(desc: { type: string; sdp: string }) {
    this.remoteDescription = desc
    this.signalingState = desc.type === 'offer' ? 'have-remote-offer' : 'stable'
  }
  async addIceCandidate() {}

  ice(state: string) {
    this.iceConnectionState = state
    this.oniceconnectionstatechange?.()
  }
}

class FakeDataChannel {
  label: string
  readyState = 'open'
  onmessage: ((e: { data: string }) => void) | null = null
  sent: string[] = []
  constructor(label: string) {
    this.label = label
  }
  send(data: string) {
    this.sent.push(data)
  }
  close() {
    this.readyState = 'closed'
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

async function flushMicrotasks() {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}

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

  it('resumeConnections() rebuilds a failed peer and ICE-restarts a live one', () => {
    const { transport, states } = makeTransport({ reconnectGraceMs: 1_000 })
    transport.setPeers(['alice', 'bob'])
    const [alice, bob] = FakePeerConnection.instances as [FakePeerConnection, FakePeerConnection]
    alice.ice('connected')
    bob.ice('disconnected')
    vi.advanceTimersByTime(1_000)
    expect(lastState(states, 'bob')).toBe('failed')
    const before = FakePeerConnection.instances.length
    alice.restartIce.mockClear()
    transport.resumeConnections()
    expect(alice.restartIce).toHaveBeenCalledTimes(1)
    expect(FakePeerConnection.instances.length).toBe(before + 1)
    expect(bob.close).toHaveBeenCalled()
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

  it('creates the moh data channel only on the impolite side and round-trips JSON', () => {
    const received: Array<[string, unknown]> = []
    const impolite = new PeerToPeerCallTransport({
      callId: 'call-1',
      selfUserId: 'zed',
      iceServers: [],
      sendSignal: vi.fn(),
      events: {
        onRemoteStream: () => {},
        onPeerState: () => {},
        onData: (userId, raw) => received.push([userId, raw]),
      },
    })
    impolite.setPeers(['alice'])
    const created = FakePeerConnection.instances.at(-1)!
    expect(created.createdChannels.map((c) => c.label)).toEqual(['moh'])

    const polite = new PeerToPeerCallTransport({
      callId: 'call-1',
      selfUserId: 'aaa',
      iceServers: [],
      sendSignal: vi.fn(),
      events: {
        onRemoteStream: () => {},
        onPeerState: () => {},
        onData: (userId, raw) => received.push([userId, raw]),
      },
    })
    polite.setPeers(['alice'])
    const politePc = FakePeerConnection.instances.at(-1)!
    expect(politePc.createdChannels).toHaveLength(0)

    impolite.sendData({ t: 'reaction', emoji: '🔥', at: 1 })
    expect(created.createdChannels[0]!.sent).toEqual(['{"t":"reaction","emoji":"🔥","at":1}'])

    politePc.ondatachannel?.({ channel: new FakeDataChannel('moh') })
    const inbound = politePc // just to keep the instance
    expect(inbound.ondatachannel).toBeTruthy()
    const ch = new FakeDataChannel('moh')
    politePc.ondatachannel?.({ channel: ch })
    ch.onmessage?.({ data: '{"t":"reaction","emoji":"👍","at":2}' })
    expect(received).toEqual([['alice', { t: 'reaction', emoji: '👍', at: 2 }]])

    impolite.destroy()
    polite.destroy()
  })

  it('applies an early remote offer before starting negotiation', async () => {
    const { transport, sendSignal } = makeTransport({ selfUserId: 'aaa' })
    await transport.handleSignal({
      callId: 'call-1',
      fromUserId: 'alice',
      description: { type: 'offer', sdp: 'v=0' },
    } as never)
    transport.setPeers(['alice'])
    await flushMicrotasks()
    const pc = FakePeerConnection.instances[0]!
    expect(pc.remoteDescription).toEqual({ type: 'offer', sdp: 'v=0' })
    expect(sendSignal).toHaveBeenCalledWith(
      'alice',
      expect.objectContaining({ description: expect.objectContaining({ type: 'answer' }) }),
    )
    transport.destroy()
  })

  it('opens audio + camera + screen so iOS and web share the same m-line order', () => {
    const { transport } = makeTransport()
    transport.setPeers(['alice'])
    expect(FakePeerConnection.instances[0]!.transceivers).toHaveLength(3)
    transport.destroy()
  })

  it('polite peer rolls back on a colliding offer', async () => {
    const { transport } = makeTransport({ selfUserId: 'aaa' })
    transport.setPeers(['alice'])
    await flushMicrotasks()
    const pc = FakePeerConnection.instances[0]!
    pc.signalingState = 'have-local-offer'
    await transport.handleSignal({
      callId: 'call-1',
      fromUserId: 'alice',
      description: { type: 'offer', sdp: 'theirs' },
    } as never)
    expect(pc.setLocalCalls.some((d) => d?.type === 'rollback')).toBe(true)
    expect(pc.remoteDescription).toEqual({ type: 'offer', sdp: 'theirs' })
    transport.destroy()
  })

  it('impolite peer ignores a colliding offer', async () => {
    const { transport } = makeTransport({ selfUserId: 'zed' })
    transport.setPeers(['alice'])
    await flushMicrotasks()
    const pc = FakePeerConnection.instances[0]!
    pc.signalingState = 'have-local-offer'
    pc.remoteDescription = null
    await transport.handleSignal({
      callId: 'call-1',
      fromUserId: 'alice',
      description: { type: 'offer', sdp: 'theirs' },
    } as never)
    expect(pc.remoteDescription).toBeNull()
    transport.destroy()
  })

  it('renegotiates after a late camera so iOS gets a new offer with the track', async () => {
    const { transport, sendSignal } = makeTransport()
    transport.setPeers(['alice'])
    await flushMicrotasks()
    const pc = FakePeerConnection.instances[0]!
    pc.remoteDescription = { type: 'answer', sdp: 'theirs' }
    pc.signalingState = 'stable'
    sendSignal.mockClear()
    await transport.setLocalTrack(
      'video',
      { id: 'cam', kind: 'video', enabled: true, muted: false, readyState: 'live' } as MediaStreamTrack,
    )
    await flushMicrotasks()
    expect(sendSignal).toHaveBeenCalledWith(
      'alice',
      expect.objectContaining({ description: expect.objectContaining({ type: 'offer' }) }),
    )
    transport.destroy()
  })

  it('pulls the camera receiver track after ICE connects even if ontrack never fired', async () => {
    const { transport, streams } = makeTransport()
    transport.setPeers(['alice'])
    await flushMicrotasks()
    const pc = FakePeerConnection.instances[0]!
    pc.transceivers[1]!.receiver.track = {
      id: 'recv-cam',
      kind: 'video',
      enabled: true,
      muted: true,
      readyState: 'live',
    }
    pc.ice('connected')
    const last = streams.filter(([id]) => id === 'alice').at(-1)?.[1]
    expect(last?.getTracks().some((t) => t.id === 'recv-cam')).toBe(true)
    transport.destroy()
  })

  it('re-offers when still connecting with no remote description', async () => {
    const { transport, sendSignal } = makeTransport({ selfUserId: 'zed' })
    transport.setPeers(['alice'])
    await flushMicrotasks()
    sendSignal.mockClear()
    vi.advanceTimersByTime(CONNECTING_RESTART_MS)
    await flushMicrotasks()
    expect(sendSignal).toHaveBeenCalledWith(
      'alice',
      expect.objectContaining({ description: expect.objectContaining({ type: 'offer' }) }),
    )
    transport.destroy()
  })
})
