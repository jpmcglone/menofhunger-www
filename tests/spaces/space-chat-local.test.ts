import { afterEach, describe, expect, it } from 'vitest'
import type { SpaceChatMessage } from '~/types/api'
import {
  SPACE_CHAT_LOCAL_PREFIX,
  SPACE_CHAT_MAX_AGE_MS,
  SPACE_CHAT_MAX_PER_SPACE,
  SPACE_CHAT_MAX_SPACES,
  clearSpaceChatLocal,
  loadAllSpaceChatLocal,
  loadSpaceChatLocal,
  pruneSpaceChatMessages,
  spaceChatOwnerId,
  writeSpaceChatLocal,
} from '../../utils/space-chat-local'

function msg(id: string, createdAt: string, spaceId = 'space-1'): SpaceChatMessage {
  return {
    id,
    spaceId,
    kind: 'user',
    body: `hello ${id}`,
    createdAt,
    sender: {
      id: 'u1',
      username: 'john',
      premium: false,
      premiumPlus: false,
      isOrganization: false,
      verifiedStatus: 'none',
      stewardBadgeEnabled: false,
    },
  }
}

describe('spaceChatOwnerId', () => {
  it('keys by the active signed-in user, including while an admin is proxying', () => {
    expect(spaceChatOwnerId(null)).toBeNull()
    expect(spaceChatOwnerId({ id: 'admin-1', impersonation: null })).toBe('admin-1')
    expect(
      spaceChatOwnerId({
        id: 'john-1',
        impersonation: { adminUserId: 'admin-1' },
      }),
    ).toBe('john-1')
  })
})

describe('pruneSpaceChatMessages', () => {
  it('drops messages older than 24 hours and keeps the newest cap', () => {
    const now = Date.parse('2026-08-14T18:00:00.000Z')
    const fresh = msg('fresh', '2026-08-14T12:00:00.000Z')
    const stale = msg('stale', '2026-08-13T17:00:00.000Z')
    expect(pruneSpaceChatMessages([stale, fresh], now).map((m) => m.id)).toEqual(['fresh'])

    const many = Array.from({ length: SPACE_CHAT_MAX_PER_SPACE + 25 }, (_, i) =>
      msg(`m${i}`, new Date(now - 60_000).toISOString()),
    )
    const pruned = pruneSpaceChatMessages(many, now)
    expect(pruned).toHaveLength(SPACE_CHAT_MAX_PER_SPACE)
    expect(pruned[0]?.id).toBe('m25')
    expect(pruned.at(-1)?.id).toBe(`m${SPACE_CHAT_MAX_PER_SPACE + 24}`)
  })

  it('uses a 24h window', () => {
    expect(SPACE_CHAT_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000)
  })
})

describe('space chat localStorage', () => {
  afterEach(() => {
    clearSpaceChatLocal()
  })

  it('round-trips messages for one viewer and space', () => {
    const now = Date.parse('2026-08-14T18:00:00.000Z')
    const a = msg('a', '2026-08-14T17:00:00.000Z')
    writeSpaceChatLocal('user-1', 'space-1', [a], now)
    expect(loadSpaceChatLocal('user-1', 'space-1', now).map((m) => m.id)).toEqual(['a'])
    expect(loadSpaceChatLocal('user-2', 'space-1', now)).toEqual([])
  })

  it('does not leak one viewer\'s history to another', () => {
    const now = Date.parse('2026-08-14T18:00:00.000Z')
    writeSpaceChatLocal('user-1', 'space-1', [msg('a', '2026-08-14T17:00:00.000Z')], now)
    expect(loadAllSpaceChatLocal('user-2', now)).toEqual({})
    expect(Object.keys(localStorage).some((k) => k.startsWith(SPACE_CHAT_LOCAL_PREFIX))).toBe(true)
  })

  it('keeps only the most recently written spaces', () => {
    const now = Date.parse('2026-08-14T18:00:00.000Z')
    for (let i = 0; i < SPACE_CHAT_MAX_SPACES + 1; i += 1) {
      writeSpaceChatLocal(
        'user-1',
        `space-${i}`,
        [msg(`m${i}`, '2026-08-14T17:00:00.000Z', `space-${i}`)],
        now + i,
      )
    }
    const stored = loadAllSpaceChatLocal('user-1', now)
    expect(Object.keys(stored)).toHaveLength(SPACE_CHAT_MAX_SPACES)
    expect(stored['space-0']).toBeUndefined()
    expect(stored[`space-${SPACE_CHAT_MAX_SPACES}`]?.[0]?.id).toBe(`m${SPACE_CHAT_MAX_SPACES}`)
  })

  it('clears one viewer without touching another', () => {
    const now = Date.parse('2026-08-14T18:00:00.000Z')
    writeSpaceChatLocal('user-1', 'space-1', [msg('a', '2026-08-14T17:00:00.000Z')], now)
    writeSpaceChatLocal('user-2', 'space-1', [msg('b', '2026-08-14T17:00:00.000Z')], now)
    clearSpaceChatLocal('user-1')
    expect(loadSpaceChatLocal('user-1', 'space-1', now)).toEqual([])
    expect(loadSpaceChatLocal('user-2', 'space-1', now).map((m) => m.id)).toEqual(['b'])
  })
})
