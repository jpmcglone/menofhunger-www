import { describe, expect, it } from 'vitest'
import type { RecentSearch, RecentSearchUser } from '~/types/api'

// ─── Inline logic mirroring useRecentSearches.ts ─────────────────────────────

function makeUser(id: string, username: string): RecentSearchUser {
  return {
    id,
    username,
    name: username,
    premium: false,
    premiumPlus: false,
    isOrganization: false,
    stewardBadgeEnabled: false,
    verifiedStatus: 'none',
    avatarUrl: null,
  }
}

function makeQueryRecent(id: string, query: string): RecentSearch {
  return { id, query, createdAt: new Date().toISOString(), user: null, group: null }
}

function makeUserRecent(id: string, user: RecentSearchUser): RecentSearch {
  return { id, query: `@${user.username}`, createdAt: new Date().toISOString(), user, group: null }
}

/** Mirrors the optimistic recordUser logic in useRecentSearches.ts. */
function recordUserOptimistic(recents: RecentSearch[], user: RecentSearchUser): RecentSearch[] {
  const existing = recents.find((r) => r.user?.id === user.id)
  if (existing) {
    return [existing, ...recents.filter((r) => r.user?.id !== user.id)]
  }
  const optimistic: RecentSearch = {
    id: `tmp-u-${user.id}`,
    query: user.username ? `@${user.username}` : '',
    createdAt: new Date().toISOString(),
    user,
    group: null,
  }
  return [optimistic, ...recents].slice(0, 10)
}

/** Mirrors the remove logic. */
function removeOptimistic(recents: RecentSearch[], id: string): RecentSearch[] {
  return recents.filter((r) => r.id !== id)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useRecentSearches optimistic state', () => {
  it('prepends a new user entry', () => {
    const user = makeUser('u1', 'alice')
    const result = recordUserOptimistic([], user)
    expect(result).toHaveLength(1)
    expect(result.at(0)?.user?.id).toBe('u1')
    expect(result.at(0)?.query).toBe('@alice')
    expect(result.at(0)?.id).toBe('tmp-u-u1')
  })

  it('moves an existing user entry to the front instead of duplicating', () => {
    const user = makeUser('u1', 'alice')
    const initial = [
      makeQueryRecent('r1', 'hello'),
      makeUserRecent('r2', user),
      makeQueryRecent('r3', 'world'),
    ]
    const result = recordUserOptimistic(initial, user)
    expect(result).toHaveLength(3)
    expect(result.at(0)?.id).toBe('r2')
    expect(result.at(1)?.id).toBe('r1')
    expect(result.at(2)?.id).toBe('r3')
  })

  it('caps the list at 10 items', () => {
    const existing: RecentSearch[] = Array.from({ length: 10 }, (_, i) =>
      makeQueryRecent(`r${i}`, `query ${i}`),
    )
    const user = makeUser('u99', 'newuser')
    const result = recordUserOptimistic(existing, user)
    expect(result).toHaveLength(10)
    expect(result.at(0)?.user?.id).toBe('u99')
  })

  it('removes an entry by id', () => {
    const recents = [makeQueryRecent('r1', 'foo'), makeQueryRecent('r2', 'bar')]
    const result = removeOptimistic(recents, 'r1')
    expect(result).toHaveLength(1)
    expect(result.at(0)?.id).toBe('r2')
  })

  it('does nothing when removing a non-existent id', () => {
    const recents = [makeQueryRecent('r1', 'foo')]
    const result = removeOptimistic(recents, 'r99')
    expect(result).toHaveLength(1)
  })
})

describe('RecentSearch type shape', () => {
  it('allows user to be null (typed query)', () => {
    const entry: RecentSearch = { id: 'x', query: 'test', createdAt: '2026-08-03T00:00:00Z', user: null, group: null }
    expect(entry.user).toBeNull()
    expect(entry.group).toBeNull()
  })

  it('allows user to be populated (profile tap)', () => {
    const user = makeUser('u1', 'bob')
    const entry: RecentSearch = {
      id: 'y',
      query: '@bob',
      createdAt: '2026-08-03T00:00:00Z',
      user,
      group: null,
    }
    expect(entry.user?.username).toBe('bob')
  })
})
