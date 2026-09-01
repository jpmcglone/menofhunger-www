import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

describe('DM calling realtime wiring', () => {
  it('routes calls:incoming / calls:updated / rtc:signal through the shared presence registry', () => {
    const domains = read('composables/presence/usePresenceDomains.ts')
    expect(domains).toContain("socket.on('calls:incoming'")
    expect(domains).toContain("socket.on('calls:updated'")
    expect(domains).toContain("socket.on('rtc:signal'")
    expect(domains).toContain('cb.onIncoming?.(data)')
    expect(domains).toContain('cb.onUpdated?.(data)')
    expect(domains).toContain('cb.onSignal?.(data)')

    const presence = read('composables/usePresence.ts')
    expect(presence).toContain('addCallsCallback: domains.calls.add')
    expect(presence).toContain('removeCallsCallback: domains.calls.remove')
  })

  it('uses acked emits for lifecycle actions and fire-and-forget for state/signal', () => {
    const emitters = read('composables/presence/createPresenceEmitters.ts')
    for (const ev of ['calls:start', 'calls:join', 'calls:leave', 'calls:decline']) {
      expect(emitters).toContain(`emitCallsWithAck(socketRef.value, '${ev}'`)
    }
    expect(emitters).toContain('emitWithAck(event, payload)')
    expect(emitters).toContain("socket.emit('calls:state'")
    expect(emitters).toContain("socket.emit('rtc:signal'")
  })

  it('binds the session once per tab from the client-only host and leaves on unload', () => {
    const overlays = read('components/app/layout/GlobalOverlays.vue')
    expect(overlays).toMatch(/<ClientOnly>[\s\S]*<AppCallsCallHost v-if="isAuthed" \/>[\s\S]*<\/ClientOnly>/)

    const host = read('components/app/calls/CallHost.vue')
    expect(host).toContain('unbind = bind()')

    const session = read('composables/calls/useCallSession.ts')
    expect(session).toContain("window.addEventListener('pagehide', onPageHide)")
    expect(session).toContain("window.addEventListener('beforeunload', onPageHide)")
    expect(session).toContain('void rejoinAfterReconnect()')
  })

  it('gives up on the server-owned grace window: socket down, all peers failed, online restart, visibility resync', () => {
    const session = read('composables/calls/useCallSession.ts')
    expect(session).toContain('ack.reconnectGraceMs')
    expect(session).toContain('reconnectGraceMs,')
    expect(session).toMatch(/socketDownTimer = setTimeout\([\s\S]*connectionLost\(\)[\s\S]*\}, reconnectGraceMs\)/)
    expect(session).toContain("ids.every((id) => peerStates.value[id] === 'failed')")
    expect(session).toContain("window.addEventListener('online', onOnline)")
    expect(session).toContain('transport?.restartIce()')
    expect(session).toContain("document.addEventListener('visibilitychange', onVisibility)")
    expect(session).toContain("title: 'Connection lost.'")
  })

  it('keeps the chat page in sync: activeCall patched from calls:updated, call rows patched from messages:edited', () => {
    const chat = read('pages/chat.vue')
    expect(chat).toContain('onCallUpdated(convoId, call)')
    expect(chat).toContain('patchConversation(convoId, (c) => ({ ...c, activeCall: call }))')
    expect(chat).toContain("kind: msg.kind ?? 'text', call: msg.call ?? null")

    const realtime = read('composables/chat/useChatRealtime.ts')
    expect(realtime).toContain("payload.call && payload.call.status !== 'ended' ? payload.call : null")
  })

  it('renders kind=call rows as the system chip, never as a text bubble', () => {
    const row = read('components/app/chat/ChatMessageListRow.vue')
    expect(row).toContain('v-else-if="callMessage"')
    expect(row).toContain("m.kind !== 'call'")
  })

  it('one seat per member: a displaced tab stands down locally and never sends calls:leave', () => {
    const domains = read('composables/presence/usePresenceDomains.ts')
    expect(domains).toContain("socket.on('calls:seat-taken'")
    expect(domains).toContain('cb.onSeatTaken?.(data)')

    const session = read('composables/calls/useCallSession.ts')
    const handler = session.slice(session.indexOf('function onSeatTaken('), session.indexOf('function bind('))
    expect(handler).toContain('if (presence.getSocketId() !== payload.socketId) return')
    expect(handler).toContain('teardown()')
    expect(handler).toContain("phase: 'in_call_elsewhere'")
    expect(handler).not.toContain('emitCallsLeave')
    // The server owns "one call at a time" now; the client no longer retries around a stale seat.
    expect(session).not.toContain('already_in_call')

    const miniBar = read('components/app/calls/CallMiniBar.vue')
    expect(miniBar).toContain('void joinCall({ id: current.id, type: current.type })')
  })

  it('a seat held server-side but not live here is always recoverable with "Rejoin"', () => {
    // After a reload (or a dropped calls:leave) the server still lists us; the UI must never
    // show a dead "In call" label with no way back in. Every surface offers a join that takes
    // the seat over.
    for (const file of ['components/app/chat/ChatCallBanner.vue', 'components/app/chat/ChatThreadHeader.vue']) {
      const src = read(file)
      expect(src).toContain('label="Rejoin"')
      expect(src).not.toContain("'In call'")
      // "Show call" is gated on being engaged in this tab in any live phase, not just in_call.
      expect(src).toContain('isEngaged')
    }
    const row = read('components/app/chat/ChatMessageCallRow.vue')
    expect(row).toContain("viewerInCall.value ? 'Rejoin'")
    expect(row).toContain('const showJoin = computed(() => !inThisTab.value)')

    // joinCall accepts the idle tab that got here via reload.
    const session = read('composables/calls/useCallSession.ts')
    expect(session).toContain("if (phase.value !== 'idle' && phase.value !== 'in_call_elsewhere' && phase.value !== 'incoming')")
  })

  it('never lets the polite peer race the impolite one on ICE restart', () => {
    const transport = read('composables/calls/transport/PeerToPeerCallTransport.ts')
    expect(transport).toContain('polite: this.opts.selfUserId < userId')
    expect(transport).toContain("if (peer.polite || peer.state === 'failed') return")
    expect(transport).toContain('peer.pc.restartIce()')
    expect(transport).toContain('peer.ignoreOffer = !peer.polite && offerCollision')
  })
})
