import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, beforeEach } from 'vitest'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

// ---------------------------------------------------------------------------
// Structural guardrails (no Nuxt runtime required)
// ---------------------------------------------------------------------------

describe('applyIdentitySwap guardrail (structural)', () => {
  it('calls me() directly, not ensureLoaded(), so impersonation metadata is always re-read', () => {
    const src = readFromRepo('composables/useAuth.ts')
    // Extract applyIdentitySwap body
    const block =
      src.match(/async function applyIdentitySwap[\s\S]*?(?=\n {2}\/\*\*|\n {2}async function)/)?.[0] ?? ''
    expect(block).toBeTruthy()
    // Must call me(), not ensureLoaded() — ensureLoaded early-returns when didAttempt is true
    expect(block).toMatch(/await me\(\)/)
    expect(block).not.toMatch(/await ensureLoaded\(\)/)
  })
})

describe('useUserOverlay stale-snapshot guardrail (structural)', () => {
  it('seeds the store from embedded snapshots instead of upsertting, so stale props never clobber fresh values', () => {
    const src = readFromRepo('composables/useUserOverlay.ts')
    // The watch must call seed, not upsert
    expect(src).toMatch(/users\.seed\(/)
    expect(src).not.toMatch(/users\.upsert\(/)
  })
})

describe('usePublicProfile store-overlay guardrail (structural)', () => {
  it('returns a store-overlaid profile computed so realtime updates (socket + patchProfile) propagate without a refetch', () => {
    const src = readFromRepo('composables/usePublicProfile.ts')
    expect(src).toMatch(/usersStore\.overlay\(/)
  })

  it('does NOT upsert data.value into the store (prevents getCachedData stale-SSR from reverting a post-save store update)', () => {
    // The store is updated by patchPublicProfile (page) and syncUserCaches — NOT by a
    // watch on data.value inside usePublicProfile. A watch with upsert would call
    // upsert(oldBannerUrl) whenever getCachedData returns the stale SSR payload after
    // refreshNuxtData, silently reverting the banner the user just saved.
    const src = readFromRepo('composables/usePublicProfile.ts')
    expect(src).not.toMatch(/watch[\s\S]{0,300}usersStore\.upsert/)
  })

  it('patchPublicProfile in the profile page upserts into the store so banner/avatar updates are immediate', () => {
    const src = readFromRepo('pages/u/[username].vue')
    // The page owns the optimistic write; the composable just overlays.
    expect(src).toMatch(/usersStore\.upsert\(/)
  })
})

// ---------------------------------------------------------------------------
// Unit tests for useUsersStore seed vs upsert semantics (pure logic)
// ---------------------------------------------------------------------------

// Minimal re-implementation of the store logic to run without Nuxt/Vue runtime.
// These tests mirror the shape of the real composable to guard the invariants.

type Entity = Record<string, unknown>

function mergeDefined(prev: Entity, next: Partial<Entity>): Entity {
  const out = { ...prev }
  for (const k of Object.keys(next)) {
    const v = next[k]
    if (v !== undefined) out[k] = v
  }
  return out
}

function makeStore() {
  const byId: Record<string, Entity> = {}

  function upsert(user: Partial<{ id: string } & Entity> | null | undefined) {
    if (!user) return
    const id = String(user?.id ?? '').trim()
    if (!id) return
    const prev = byId[id] ?? {}
    byId[id] = mergeDefined(prev, user)
  }

  function seed(user: Partial<{ id: string } & Entity> | null | undefined) {
    if (!user) return
    const id = String(user?.id ?? '').trim()
    if (!id) return
    const prev = byId[id] ?? {}
    const patch: Entity = {}
    for (const k of Object.keys(user)) {
      if (!(k in prev)) patch[k] = (user as Entity)[k]
    }
    if (Object.keys(patch).length === 0) return
    byId[id] = mergeDefined(prev, patch)
  }

  function get(id: string): Entity | null {
    return byId[id] ?? null
  }

  return { upsert, seed, get }
}

describe('useUsersStore — upsert vs seed semantics', () => {
  let store: ReturnType<typeof makeStore>

  beforeEach(() => {
    store = makeStore()
  })

  it('upsert overwrites an existing defined value', () => {
    store.upsert({ id: 'u1', avatarUrl: 'https://cdn.example.com/old.jpg' })
    store.upsert({ id: 'u1', avatarUrl: 'https://cdn.example.com/new.jpg' })
    expect(store.get('u1')?.avatarUrl).toBe('https://cdn.example.com/new.jpg')
  })

  it('seed does NOT overwrite an existing defined value', () => {
    store.upsert({ id: 'u1', avatarUrl: 'https://cdn.example.com/fresh.jpg' })
    store.seed({ id: 'u1', avatarUrl: 'https://cdn.example.com/stale.jpg' })
    expect(store.get('u1')?.avatarUrl).toBe('https://cdn.example.com/fresh.jpg')
  })

  it('seed fills keys absent from the existing entry', () => {
    store.upsert({ id: 'u1', avatarUrl: 'https://cdn.example.com/fresh.jpg' })
    store.seed({ id: 'u1', username: 'newuser', avatarUrl: 'https://cdn.example.com/stale.jpg' })
    expect(store.get('u1')?.username).toBe('newuser')
    expect(store.get('u1')?.avatarUrl).toBe('https://cdn.example.com/fresh.jpg')
  })

  it('seed on a new entry writes all fields', () => {
    store.seed({ id: 'u2', avatarUrl: 'https://cdn.example.com/img.jpg', username: 'joe' })
    expect(store.get('u2')?.avatarUrl).toBe('https://cdn.example.com/img.jpg')
    expect(store.get('u2')?.username).toBe('joe')
  })

  it('upsert does not overwrite with undefined (mergeDefined contract)', () => {
    store.upsert({ id: 'u1', avatarUrl: 'https://cdn.example.com/original.jpg' })
    store.upsert({ id: 'u1', avatarUrl: undefined })
    expect(store.get('u1')?.avatarUrl).toBe('https://cdn.example.com/original.jpg')
  })

  it('upsert sets null explicitly (user removed their avatar)', () => {
    store.upsert({ id: 'u1', avatarUrl: 'https://cdn.example.com/original.jpg' })
    store.upsert({ id: 'u1', avatarUrl: null })
    expect(store.get('u1')?.avatarUrl).toBeNull()
  })
})
