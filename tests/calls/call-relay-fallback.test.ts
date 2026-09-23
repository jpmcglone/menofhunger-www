import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  hasRelayServer,
  isPathTrouble,
  nextRelayStreak,
  pathSampleFromStats,
  RELAY_AFTER_TROUBLED_SAMPLES,
  RELAY_CONFIRM_MS,
} from '~/composables/calls/callRelayFallback'
import { QUALITY_WARMUP_MS } from '~/composables/calls/callQuality'
import { PeerToPeerCallTransport } from '~/composables/calls/transport/PeerToPeerCallTransport'

function pathStats(localType: 'srflx' | 'relay' | 'host', fractionLost: number) {
  return [
    { id: 't', type: 'transport', selectedCandidatePairId: 'p' },
    { id: 'p', type: 'candidate-pair', localCandidateId: 'l', remoteCandidateId: 'r', currentRoundTripTime: 0.08 },
    { id: 'l', type: 'local-candidate', candidateType: localType },
    { id: 'r', type: 'remote-candidate', candidateType: 'srflx' },
    { id: 'a', type: 'remote-inbound-rtp', kind: 'audio', fractionLost, roundTripTime: 0.08 },
  ]
}

class FakePeerConnection {
  static instances: FakePeerConnection[] = []
  stats = pathStats('srflx', 0.2)
  config: RTCConfiguration = {}
  iceConnectionState = 'new'
  connectionState = 'new'
  signalingState = 'stable'
  localDescription: unknown = null
  remoteDescription: unknown = null
  restartIce = vi.fn()
  close = vi.fn()
  policies: Array<RTCIceTransportPolicy | undefined> = []
  onnegotiationneeded: (() => void) | null = null
  onicecandidate: ((e: unknown) => void) | null = null
  ontrack: ((e: unknown) => void) | null = null
  oniceconnectionstatechange: (() => void) | null = null
  onconnectionstatechange: (() => void) | null = null
  ondatachannel: ((e: unknown) => void) | null = null

  constructor(config: RTCConfiguration) {
    this.config = config
    FakePeerConnection.instances.push(this)
  }
  getConfiguration() {
    return this.config
  }
  setConfiguration(config: RTCConfiguration) {
    this.config = config
    this.policies.push(config.iceTransportPolicy)
  }
  createDataChannel() {
    return { readyState: 'open', close: vi.fn(), send: vi.fn() }
  }
  addTransceiver(kind?: string) {
    return {
      mid: null,
      sender: { replaceTrack: vi.fn(async () => undefined), getParameters: () => ({ encodings: [{}] }), setParameters: vi.fn(async () => undefined), track: null },
      receiver: { track: { id: `${kind}-recv`, kind, readyState: 'live' } },
    }
  }
  getTransceivers() {
    return []
  }
  getSenders() {
    return []
  }
  async getStats() {
    return new Map(this.stats.map((s) => [s.id, s]))
  }
  async setLocalDescription() {}
  async setRemoteDescription() {}
  async addIceCandidate() {}
  connect() {
    this.iceConnectionState = 'connected'
    this.oniceconnectionstatechange?.()
  }
}

class FakeMediaStream {
  getTracks() {
    return []
  }
  removeTrack() {}
}

const TURN = [{ urls: ['stun:stun.cloudflare.com:3478'] }, { urls: ['turn:turn.cloudflare.com:3478?transport=udp'], username: 'u', credential: 'c' }]

function makeTransport(iceServers = TURN) {
  return new PeerToPeerCallTransport({
    callId: 'call-1',
    selfUserId: 'zed',
    iceServers,
    sendSignal: vi.fn(),
    events: { onRemoteStream: () => {}, onPeerState: () => {} },
  })
}

async function runSamples(ms: number) {
  await vi.advanceTimersByTimeAsync(ms)
}

describe('relay fallback rules', () => {
  it('counts only troubled STUN samples', () => {
    expect(nextRelayStreak(2, 'stun', true)).toBe(3)
    expect(nextRelayStreak(2, 'stun', false)).toBe(0)
    expect(nextRelayStreak(2, 'direct', true)).toBe(0)
    expect(nextRelayStreak(2, 'turn', true)).toBe(0)
  })

  it('treats loss or delay as trouble, not a clean path', () => {
    expect(isPathTrouble({ fractionLost: 0.08, rttSeconds: 0.05 })).toBe(true)
    expect(isPathTrouble({ fractionLost: 0, rttSeconds: 0.6 })).toBe(true)
    expect(isPathTrouble({ fractionLost: 0.01, rttSeconds: 0.1 })).toBe(false)
  })

  it('reads audio loss so audio-only calls qualify', () => {
    expect(pathSampleFromStats(pathStats('srflx', 0.2))).toEqual({ fractionLost: 0.2, rttSeconds: 0.08 })
  })

  it('requires a TURN URL', () => {
    expect(hasRelayServer(TURN)).toBe(true)
    expect(hasRelayServer([{ urls: ['stun:stun.l.google.com:19302'] }])).toBe(false)
  })
})

describe('PeerToPeerCallTransport relay fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    FakePeerConnection.instances = []
    vi.stubGlobal('RTCPeerConnection', FakePeerConnection)
    vi.stubGlobal('MediaStream', FakeMediaStream)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const untilRelay = QUALITY_WARMUP_MS + (RELAY_AFTER_TROUBLED_SAMPLES + 1) * 2_000

  it('moves a lossy STUN path to TURN and keeps it once the relay is selected', async () => {
    const transport = makeTransport()
    transport.setPeers(['alice'])
    const pc = FakePeerConnection.instances[0]!
    pc.connect()
    await runSamples(untilRelay)
    expect(pc.policies).toEqual(['relay'])
    expect(pc.restartIce).toHaveBeenCalledTimes(1)

    pc.stats = pathStats('relay', 0)
    await runSamples(RELAY_CONFIRM_MS)
    expect(pc.policies).toEqual(['relay'])
    transport.destroy()
  })

  it('returns to normal ICE when the relay never takes over', async () => {
    const transport = makeTransport()
    transport.setPeers(['alice'])
    const pc = FakePeerConnection.instances[0]!
    pc.connect()
    await runSamples(untilRelay + RELAY_CONFIRM_MS)
    expect(pc.policies).toEqual(['relay', 'all'])
    expect(pc.restartIce).toHaveBeenCalledTimes(2)

    await runSamples(untilRelay)
    expect(pc.policies).toEqual(['relay', 'all'])
    transport.destroy()
  })

  it('leaves the path alone without a TURN server', async () => {
    const transport = makeTransport([{ urls: ['stun:stun.l.google.com:19302'] }])
    transport.setPeers(['alice'])
    const pc = FakePeerConnection.instances[0]!
    pc.connect()
    await runSamples(untilRelay)
    expect(pc.policies).toEqual([])
    transport.destroy()
  })
})
