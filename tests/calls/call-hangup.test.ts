import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')

describe('hangup chime', () => {
  it('plays the shared two-note descending chime when an engaged call ends', () => {
    const sound = read('composables/calls/callHangupSound.ts')
    expect(sound).toContain('784')
    expect(sound).toContain('523')
    expect(sound).toContain("osc.type = 'sine'")
    expect(sound).toContain('NOTE_TWO_START = 0.2')

    const session = read('composables/calls/useCallSession.ts')
    expect(session).toContain('createHangupChime')
    expect(session).toContain('playHangupChime')
    expect(session).toContain('shouldPlayHangupChime')
  })
})
