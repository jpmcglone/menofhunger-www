import type { SfuAckDto, SfuRequestDto } from '~/types/api-contracts.gen'
import type { WsRtcSignalPayload } from '~/types/api'
import { callMediaLog } from '../callMediaLog'
import { CallQualityManager, prioritizeAudioSender } from '../useCallQualityManager'
import type { CallLocalTrackKind, CallTransport, CallTransportOptions } from './CallTransport'

type Connection = {
  id: string
  pc: RTCPeerConnection
  remoteUserId?: string
  queue: Promise<void>
  mids: Map<string, CallLocalTrackKind>
  senders: Map<CallLocalTrackKind, RTCRtpTransceiver>
  published: Set<CallLocalTrackKind>
  closed: boolean
  opened: boolean
  stage: string
  timer?: ReturnType<typeof setTimeout>
}

/** One upload, with separate receive connections so each participant can recover independently. */
export class CloudflareSfuCallTransport implements CallTransport {
  readonly qualityManager: CallQualityManager
  private publisher: Connection | null = null
  private readonly subscribers = new Map<string, Connection>()
  private readonly sessions = new Map<string, string | null>()
  private readonly tracks = new Map<CallLocalTrackKind, MediaStreamTrack | null>()
  private readonly recovery = new Map<string, { deadline: number, timer: ReturnType<typeof setTimeout> }>()
  private readonly failed = new Set<string>()
  private destroyed = false
  private requestQueue: Promise<SfuAckDto> = Promise.resolve({})

  constructor(
    private readonly opts: CallTransportOptions,
    private readonly request: (request: SfuRequestDto) => Promise<SfuAckDto>,
    onTierChange: () => void = () => {},
  ) {
    this.qualityManager = new CallQualityManager(onTierChange)
  }

  setPeers(userIds: string[]): void {
    if (this.destroyed) return
    const wanted = new Set(userIds.filter(id => id !== this.opts.selfUserId))
    for (const [id, connection] of this.subscribers) {
      if (!wanted.has(id)) {
        this.close(connection)
        this.subscribers.delete(id)
        this.clearRecovery(id)
        this.failed.delete(id)
        this.opts.events.onRemoteStream(id, null)
        this.opts.events.onRemoteScreenStream?.(id, null)
      }
    }
    for (const id of wanted) if (!this.subscribers.has(id)) this.subscribe(id)
  }

  syncPeerSessions(sessions: Record<string, string | null>): void {
    for (const [id, session] of Object.entries(sessions)) {
      const previous = this.sessions.get(id)
      this.sessions.set(id, session)
      if (previous !== undefined && previous !== session && this.subscribers.has(id)) this.subscribe(id)
    }
  }

  async handleSignal(payload: WsRtcSignalPayload): Promise<void> {
    if (payload.callId !== this.opts.callId || !this.subscribers.has(payload.fromUserId)) return
    if (payload.data) {
      try { this.opts.events.onData?.(payload.fromUserId, JSON.parse(payload.data)) } catch { /* Ignore malformed reactions. */ }
    }
    if (payload.callId === this.opts.callId && payload.sfuChanged && this.subscribers.has(payload.fromUserId)) {
      this.subscribe(payload.fromUserId)
    }
  }

  async setLocalTrack(kind: CallLocalTrackKind, track: MediaStreamTrack | null): Promise<void> {
    this.tracks.set(kind, track)
    if (this.destroyed || (!track && !this.publisher)) return
    const connection = this.publisher ?? this.createPublisher()
    await this.enqueue(connection, async () => {
      const current = this.tracks.get(kind) ?? null
      const existing = connection.senders.get(kind)
      if (existing) {
        await existing.sender.replaceTrack(current)
        if (!current && connection.published.has(kind) && existing.mid) {
          await this.rpc(connection, 'unpublish', { tracks: [{ kind, mid: existing.mid }] })
          connection.published.delete(kind)
        }
        this.qualityManager.reapply()
        if (!current || connection.published.has(kind)) return
      }
      if (!current) return
      const transceiver = existing ?? connection.pc.addTransceiver(current, { direction: 'sendonly' })
      connection.senders.set(kind, transceiver)
      if (kind === 'audio') await prioritizeAudioSender(transceiver.sender)
      await connection.pc.setLocalDescription(await connection.pc.createOffer())
      connection.stage = 'gathering'
      await gatherCandidates(connection.pc)
      if (!transceiver.mid) throw new Error('Missing track mid')
      await this.open(connection)
      const ack = await this.rpc(connection, 'publish', {
        sessionDescription: description(connection.pc.localDescription),
        tracks: [{ kind, mid: transceiver.mid }],
      })
      if (!ack.sessionDescription?.sdp) throw new Error('Missing SFU answer')
      await connection.pc.setRemoteDescription({ type: 'answer', sdp: ack.sessionDescription.sdp })
      connection.published.add(kind)
      connection.stage = 'connecting'
      await waitForSfuConnection(connection.pc)
      await this.rpc(connection, 'ready')
      this.qualityManager.reapply()
    })
  }

  private createPublisher(): Connection {
    const connection = this.makeConnection()
    this.publisher = connection
    this.qualityManager.attach('publisher', connection.pc)
    return connection
  }

  private subscribe(userId: string): void {
    if (this.destroyed || this.failed.has(userId)) return
    const old = this.subscribers.get(userId)
    if (old) this.close(old)
    const connection = this.makeConnection(userId)
    this.subscribers.set(userId, connection)
    this.opts.events.onPeerState(userId, 'connecting')
    const media = new MediaStream()
    const screen = new MediaStream()
    connection.pc.ontrack = (event) => {
      if (connection.closed) return
      const kind = connection.mids.get(event.transceiver.mid ?? '')
      const stream = kind === 'screen' ? screen : media
      stream.addTrack(event.track)
      if (kind === 'screen') this.opts.events.onRemoteScreenStream?.(userId, stream)
      else this.opts.events.onRemoteStream(userId, stream)
    }
    void this.enqueue(connection, async () => {
      await this.open(connection)
      const ack = await this.rpc(connection, 'subscribe')
      // Publication may not exist yet. Its server event retries us when it is ready.
      if (!ack.tracks?.length) return
      for (const track of ack.tracks) connection.mids.set(track.mid, track.kind)
      if (!ack.sessionDescription?.sdp) throw new Error('Missing SFU offer')
      await connection.pc.setRemoteDescription({ type: 'offer', sdp: ack.sessionDescription.sdp })
      await connection.pc.setLocalDescription(await connection.pc.createAnswer())
      connection.stage = 'gathering'
      await gatherCandidates(connection.pc)
      await this.rpc(connection, 'answer', { sessionDescription: description(connection.pc.localDescription) })
      connection.stage = 'connecting'
      await waitForSfuConnection(connection.pc)
    })
  }

  private makeConnection(remoteUserId?: string): Connection {
    const pc = new RTCPeerConnection({ iceServers: this.opts.iceServers, bundlePolicy: 'max-bundle' })
    const connection: Connection = {
      id: crypto.randomUUID(), pc, remoteUserId, queue: Promise.resolve(),
      mids: new Map(), senders: new Map(), published: new Set(), closed: false, opened: false, stage: 'created',
    }
    pc.onconnectionstatechange = () => {
      if (connection.closed) return
      if (pc.connectionState === 'connected') {
        this.clearRecovery(remoteUserId ?? 'publisher')
        if (connection.timer) clearTimeout(connection.timer)
        connection.timer = undefined
        this.reportConnectedPeers()
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.scheduleRecovery(connection)
      }
    }
    return connection
  }

  private reportConnectedPeers(): void {
    if (this.publisher?.pc.connectionState !== 'connected') return
    for (const [id, subscriber] of this.subscribers) {
      if (!subscriber.closed && subscriber.pc.connectionState === 'connected') this.opts.events.onPeerState(id, 'connected')
    }
  }

  private async open(connection: Connection): Promise<void> {
    if (connection.opened) return
    await this.rpc(connection, 'open')
    connection.opened = true
  }

  private async rpc(connection: Connection, action: SfuRequestDto['action'], fields: Partial<SfuRequestDto> = {}): Promise<SfuAckDto> {
    if (connection.closed && action !== 'close') throw new Error('Connection closed')
    connection.stage = action
    const payload: SfuRequestDto = {
      callId: this.opts.callId, connectionId: connection.id, action,
      ...(connection.remoteUserId ? { remoteUserId: connection.remoteUserId } : {}), ...fields,
    }
    const operation = this.requestQueue.catch(() => ({})).then(() => {
      if (connection.closed && action !== 'close') throw new Error('Connection closed')
      return this.request(payload)
    })
    this.requestQueue = operation
    const ack = await operation
    if (ack.error) throw new Error(ack.error.code)
    if (connection.closed && action !== 'close') throw new Error('Connection closed')
    return ack
  }

  private enqueue(connection: Connection, work: () => Promise<void>): Promise<void> {
    connection.queue = connection.queue.then(async () => {
      if (!connection.closed) await work()
    }).catch(() => {
      if (connection.closed || this.destroyed) return
      callMediaLog('sfu.failed', {
        role: connection.remoteUserId ? 'subscriber' : 'publisher',
        stage: connection.stage, connection: connection.pc.connectionState, gathering: connection.pc.iceGatheringState,
      })
      this.scheduleRecovery(connection)
    })
    return connection.queue
  }

  private clearRecovery(slot: string): void {
    const recovery = this.recovery.get(slot)
    if (recovery) clearTimeout(recovery.timer)
    this.recovery.delete(slot)
  }

  private scheduleRecovery(connection: Connection): void {
    if (connection.closed || this.destroyed) return
    const slot = connection.remoteUserId ?? 'publisher'
    if (this.failed.has(slot)) return
    if (!this.recovery.has(slot)) {
      const grace = this.opts.reconnectGraceMs ?? 30_000
      const timer = setTimeout(() => {
        this.failed.add(slot)
        this.clearRecovery(slot)
        const current = connection.remoteUserId ? this.subscribers.get(slot) : this.publisher
        if (current) this.close(current)
        if (!connection.remoteUserId) for (const subscriber of this.subscribers.values()) this.close(subscriber)
        const ids = connection.remoteUserId ? [slot] : [...this.subscribers.keys()]
        for (const id of ids) this.opts.events.onPeerState(id, 'failed')
      }, grace)
      this.recovery.set(slot, { deadline: Date.now() + grace, timer })
    }
    const ids = connection.remoteUserId ? [slot] : [...this.subscribers.keys()]
    for (const id of ids) this.opts.events.onPeerState(id, 'reconnecting')
    if (!connection.timer) connection.timer = setTimeout(() => this.recover(connection), 3_000)
  }

  private recover(connection: Connection): void {
    if (connection.closed || this.destroyed || this.failed.has(connection.remoteUserId ?? 'publisher')) return
    this.scheduleRecovery(connection)
    if (connection.remoteUserId) this.subscribe(connection.remoteUserId)
    else {
      this.close(connection)
      this.qualityManager.detach('publisher')
      this.publisher = null
      for (const [kind, track] of this.tracks) void this.setLocalTrack(kind, track)
    }
  }

  peerCount(): number { return this.subscribers.size }
  restartIce(): void {
    this.resumeConnections()
  }
  resumeConnections(): void {
    const connections = [this.publisher, ...this.subscribers.values()]
    for (const connection of connections) {
      if (connection && connection.pc.connectionState !== 'connected') this.scheduleRecovery(connection)
    }
  }
  sendData(payload: unknown): void {
    if (this.destroyed) return
    void this.request({
      callId: this.opts.callId, connectionId: 'reaction', action: 'data', data: JSON.stringify(payload),
    }).catch(() => {})
  }

  private close(connection: Connection): void {
    if (connection.closed) return
    connection.closed = true
    if (connection.timer) clearTimeout(connection.timer)
    connection.pc.onconnectionstatechange = null
    connection.pc.ontrack = null
    connection.pc.close()
    void connection.queue.finally(() => this.rpc(connection, 'close')).catch(() => {})
  }

  destroy(): void {
    this.destroyed = true
    for (const slot of this.recovery.keys()) this.clearRecovery(slot)
    this.failed.clear()
    if (this.publisher) this.close(this.publisher)
    for (const connection of this.subscribers.values()) this.close(connection)
    this.subscribers.clear()
    this.qualityManager.destroy()
  }
}

function description(value: RTCSessionDescription | null) {
  if (!value) throw new Error('Missing local description')
  return { type: value.type, sdp: value.sdp }
}

/** Send gathered candidates in SDP. An unreachable ICE server must not discard usable candidates. */
export function gatherCandidates(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer)
      pc.removeEventListener('icegatheringstatechange', changed)
      pc.removeEventListener('connectionstatechange', closed)
      if (error) reject(error)
      else resolve()
    }
    const changed = () => { if (pc.iceGatheringState === 'complete') finish() }
    const closed = () => { if (pc.connectionState === 'closed') finish(new Error('Connection closed')) }
    const timer = setTimeout(() => {
      const hasCandidate = pc.localDescription?.sdp.split(/\r?\n/).some(line => line.startsWith('a=candidate:'))
      finish(hasCandidate ? undefined : new Error('ICE gathering timed out without a candidate'))
    }, 10_000)
    pc.addEventListener('icegatheringstatechange', changed)
    pc.addEventListener('connectionstatechange', closed)
    changed()
  })
}

export function waitForSfuConnection(pc: RTCPeerConnection): Promise<void> {
  if (pc.connectionState === 'connected') return Promise.resolve()
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer)
      pc.removeEventListener('connectionstatechange', changed)
      if (error) reject(error)
      else resolve()
    }
    const changed = () => {
      if (pc.connectionState === 'connected') finish()
      else if (pc.connectionState === 'failed' || pc.connectionState === 'closed') finish(new Error('SFU connection failed'))
    }
    const timer = setTimeout(() => finish(new Error('SFU connection timed out')), 15_000)
    pc.addEventListener('connectionstatechange', changed)
    changed()
  })

}
