import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

describe('call hand raise', () => {
  it('is a calls:state flag, only offered in 3+ person calls, and shows on the tile', () => {
    const emitters = read('composables/presence/createPresenceEmitters.ts')
    expect(emitters).toContain('handRaised?: boolean')

    const session = read('composables/calls/useCallSession.ts')
    expect(session).toContain('function toggleHand(')
    expect(session).toContain('participants.length ?? 0) > 2')
    expect(session).toContain("presence.emitCallsState(current.id, { handRaised: next })")

    const controls = read('components/app/calls/CallControls.vue')
    expect(controls).toContain('call-raise-hand')
    expect(controls).toContain('showHandRaise')

    const overlay = read('components/app/calls/CallOverlay.vue')
    expect(overlay).toContain(':show-hand-raise="isGroupCall"')
    expect(overlay).toContain('@toggle-hand="toggleHand"')
    expect(overlay).toContain(':hand-raised="isGroupCall && Boolean(p.handRaised)"')

    const tile = read('components/app/calls/CallVideoTile.vue')
    expect(tile).toContain('handRaised')
    expect(tile).toContain('Hand raised')
  })
})
