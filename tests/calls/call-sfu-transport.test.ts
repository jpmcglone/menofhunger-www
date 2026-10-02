import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SfuRequestDto } from '~/types/api-contracts.gen'
import { CloudflareSfuCallTransport, gatherCandidates, waitForSfuConnection } from '~/composables/calls/transport/CloudflareSfuCallTransport'

class FakeStream {
  tracks: unknown[] = []
  addTrack(track: unknown) { this.tracks.push(track) }
}
class FakeConnection extends EventTarget {
  static instances: FakeConnection[] = []
  iceGatheringState = 'complete'
  connectionState = 'connected'
  localDescription: unknown = null
  remoteDescription: unknown = null
  transceivers: Array<{ mid: string, sender: { track: unknown, replaceTrack: (track: unknown) => Promise<void> } }> = []
  ontrack: ((event: unknown) => void) | null = null
  onconnectionstatechange: (() => void) | null = null
  constructor() { super(); FakeConnection.instances.push(this) }
  addTransceiver(track: unknown) {
    const sender = { track, replaceTrack: async (next: unknown) => { sender.track = next } }
    const transceiver = { mid: String(this.transceivers.length), sender }
    this.transceivers.push(transceiver)
    return transceiver
  }
  getSenders() { return [] }
  getStats() { return Promise.resolve(new Map()) }
  createOffer() { return Promise.resolve({ type: 'offer', sdp: 'local' }) }
  createAnswer() { return Promise.resolve({ type: 'answer', sdp: 'local' }) }
  async setLocalDescription(description: unknown) { this.localDescription = description }
  async setRemoteDescription(description: unknown) { this.remoteDescription = description }
  close() { this.connectionState = 'closed'; this.dispatchEvent(new Event('connectionstatechange')) }
}

const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve() }
const transports: CloudflareSfuCallTransport[] = []
function harness() {
  const requests: SfuRequestDto[] = []
  const rpc = vi.fn(async (request: SfuRequestDto) => {
    requests.push(request)
    if (request.action === 'publish') return { sessionDescription: { type: 'answer', sdp: 'sfu' } }
    if (request.action === 'subscribe') return {
      sessionDescription: { type: 'offer', sdp: 'sfu' },
      tracks: [{ kind: 'audio' as const, mid: '0' }, { kind: 'screen' as const, mid: '1' }],
    }
    return {}
  })
  const events = { onRemoteStream: vi.fn(), onRemoteScreenStream: vi.fn(), onPeerState: vi.fn(), onData: vi.fn() }
  const transport = new CloudflareSfuCallTransport({ callId: 'call', selfUserId: 'me', iceServers: [], events }, rpc)
  transports.push(transport)
  return { transport, requests, rpc, events }
}

beforeEach(() => {
  vi.useFakeTimers()
  FakeConnection.instances = []
  vi.stubGlobal('RTCPeerConnection', FakeConnection)
  vi.stubGlobal('MediaStream', FakeStream)
})
afterEach(async () => {
  transports.splice(0).forEach(transport => transport.destroy())
  await flush()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Cloudflare SFU transport', () => {
  it('uploads a track once for a group, with authorized per-user subscriptions', async () => {
    const h = harness()
    await h.transport.setLocalTrack('audio', { kind: 'audio' } as MediaStreamTrack)
    h.transport.setPeers(['alice', 'bob', 'charlie'])
    await flush()
    expect(h.requests.filter(r => r.action === 'publish')).toHaveLength(1)
    expect(h.requests.filter(r => r.action === 'subscribe').map(r => r.remoteUserId)).toEqual(['alice', 'bob', 'charlie'])
    expect(h.requests.filter(r => r.action === 'ready')).toHaveLength(1)
  })
  it('unpublishes and republishes the camera so a long pause cannot reuse an expired track', async () => {
    const h = harness()
    await h.transport.setLocalTrack('video', { kind: 'video' } as MediaStreamTrack)
    await h.transport.setLocalTrack('video', null)
    await h.transport.setLocalTrack('video', { kind: 'video' } as MediaStreamTrack)
    expect(h.requests.filter(r => r.action === 'unpublish')).toHaveLength(1)
    expect(h.requests.filter(r => r.action === 'publish')).toHaveLength(2)
    expect(FakeConnection.instances).toHaveLength(1)
  })
  it('maps screen tracks by the returned mid, independently of track arrival order', async () => {
    const h = harness()
    h.transport.setPeers(['alice'])
    await flush()
    const pc = FakeConnection.instances[0]!
    pc.ontrack?.({ transceiver: { mid: '1' }, track: { kind: 'video' } })
    expect(h.events.onRemoteScreenStream).toHaveBeenCalledWith('alice', expect.any(FakeStream))
    expect(h.events.onRemoteStream).not.toHaveBeenCalled()
  })
  it('rebuilds only the changed remote seat', async () => {
    const h = harness()
    h.transport.setPeers(['alice', 'bob'])
    h.transport.syncPeerSessions({ alice: 'first', bob: 'stable' })
    await flush()
    h.transport.syncPeerSessions({ alice: 'second', bob: 'stable' })
    await flush()
    expect(h.requests.filter(r => r.action === 'subscribe' && r.remoteUserId === 'alice')).toHaveLength(2)
    expect(h.requests.filter(r => r.action === 'subscribe' && r.remoteUserId === 'bob')).toHaveLength(1)
  })
  it('ignores another call and unknown participant signals', async () => {
    const h = harness()
    h.transport.setPeers(['alice'])
    await flush()
    const before = h.requests.length
    await h.transport.handleSignal({ callId: 'another', fromUserId: 'alice', sfuChanged: true })
    await h.transport.handleSignal({ callId: 'call', fromUserId: 'outsider', sfuChanged: true })
    expect(h.requests).toHaveLength(before)
  })
  it('closes resources when a participant leaves and on teardown', async () => {
    const h = harness()
    h.transport.setPeers(['alice'])
    await flush()
    h.transport.setPeers([])
    await flush()
    expect(h.requests.filter(r => r.action === 'close')).toHaveLength(1)
    expect(h.events.onRemoteStream).toHaveBeenCalledWith('alice', null)
  })
  it('coalesces recovery and stops at the original deadline even when every replacement fails', async () => {
    const h = harness()
    h.transport.setPeers(['alice'])
    await flush()
    h.rpc.mockImplementation(async (request) => {
      h.requests.push(request)
      if (request.action === 'close') return {}
      throw new Error('provider offline')
    })
    const original = FakeConnection.instances[0]!
    original.connectionState = 'disconnected'
    original.onconnectionstatechange?.()
    h.transport.resumeConnections()
    h.transport.resumeConnections()
    expect(FakeConnection.instances).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(30_000)
    await flush()
    expect(h.events.onPeerState).toHaveBeenLastCalledWith('alice', 'failed')
    const attempts = FakeConnection.instances.length
    await vi.advanceTimersByTimeAsync(60_000)
    h.transport.resumeConnections()
    await flush()
    expect(FakeConnection.instances).toHaveLength(attempts)
  })

  it('fails candidate gathering instead of submitting incomplete SDP', async () => {
    const pc = new FakeConnection()
    pc.iceGatheringState = 'gathering'
    const assertion = expect(gatherCandidates(pc as unknown as RTCPeerConnection)).rejects.toThrow('timed out')
    await vi.advanceTimersByTimeAsync(8_000)
    await assertion
  })
  it('waits for an actual media connection before advertising a publication', async () => {
    const pc = new FakeConnection()
    pc.connectionState = 'connecting'
    let ready = false
    const pending = waitForSfuConnection(pc as unknown as RTCPeerConnection).then(() => { ready = true })
    await flush()
    expect(ready).toBe(false)
    pc.connectionState = 'connected'
    pc.dispatchEvent(new Event('connectionstatechange'))
    await pending
    expect(ready).toBe(true)
  })
})
