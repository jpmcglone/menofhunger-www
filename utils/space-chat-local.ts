import type { SpaceChatMessage } from '~/types/api'

/** Browser-only cache of messages this viewer received while present. No server store. */
export const SPACE_CHAT_LOCAL_PREFIX = 'moh.spaceChat.v1:'
export const SPACE_CHAT_MAX_AGE_MS = 24 * 60 * 60 * 1000
/** Comfortable localStorage budget: ~2k msgs × ~0.5KB stays well under quota. */
export const SPACE_CHAT_MAX_PER_SPACE = 2_000
export const SPACE_CHAT_MAX_SPACES = 8

/**
 * Owner of the browser cache: the signed-in identity, including while an admin
 * is proxying. `user.id` is already the proxied person — never the admin actor.
 */
export function spaceChatOwnerId(
  user: { id?: string | null; impersonation?: { adminUserId?: string | null } | null } | null | undefined,
): string | null {
  const id = String(user?.id ?? '').trim()
  return id || null
}

type StoredSpace = {
  updatedAt: number
  messages: SpaceChatMessage[]
}

type StoredStore = {
  spaces: Record<string, StoredSpace>
}

function storageKey(userId: string): string {
  return `${SPACE_CHAT_LOCAL_PREFIX}${userId}`
}

function isMessage(value: unknown): value is SpaceChatMessage {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  if (typeof m.id !== 'string' || !m.id.trim()) return false
  if (typeof m.spaceId !== 'string' || !m.spaceId.trim()) return false
  if (typeof m.createdAt !== 'string' || !m.createdAt) return false
  if (typeof m.body !== 'string') return false
  if (m.kind === 'user') return Boolean(m.sender && typeof m.sender === 'object')
  if (m.kind === 'system') return Boolean(m.system && typeof m.system === 'object')
  return false
}

export function pruneSpaceChatMessages(
  messages: SpaceChatMessage[],
  now = Date.now(),
): SpaceChatMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) return []
  const cutoff = now - SPACE_CHAT_MAX_AGE_MS
  const kept = messages.filter((m) => {
    const t = Date.parse(m.createdAt || '')
    return Number.isFinite(t) && t >= cutoff
  })
  if (kept.length <= SPACE_CHAT_MAX_PER_SPACE) return kept
  return kept.slice(-SPACE_CHAT_MAX_PER_SPACE)
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStore(userId: string): StoredStore {
  if (!canUseLocalStorage()) return { spaces: {} }
  const id = String(userId ?? '').trim()
  if (!id) return { spaces: {} }
  try {
    const raw = window.localStorage.getItem(storageKey(id))
    if (!raw) return { spaces: {} }
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { spaces: {} }
    const spacesRaw = (parsed as { spaces?: unknown }).spaces
    if (!spacesRaw || typeof spacesRaw !== 'object' || Array.isArray(spacesRaw)) return { spaces: {} }
    const spaces: Record<string, StoredSpace> = {}
    for (const [spaceId, entry] of Object.entries(spacesRaw as Record<string, unknown>)) {
      if (!spaceId || !entry || typeof entry !== 'object' || Array.isArray(entry)) continue
      const rec = entry as { updatedAt?: unknown; messages?: unknown }
      const updatedAt = Number(rec.updatedAt)
      const messages = Array.isArray(rec.messages) ? rec.messages.filter(isMessage) : []
      spaces[spaceId] = {
        updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0,
        messages,
      }
    }
    return { spaces }
  } catch {
    return { spaces: {} }
  }
}

function evictOldestSpaces(store: StoredStore, keep: number): StoredStore {
  const entries = Object.entries(store.spaces)
  if (entries.length <= keep) return store
  entries.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
  const spaces: Record<string, StoredSpace> = {}
  for (const [id, rec] of entries.slice(0, Math.max(0, keep))) {
    spaces[id] = rec
  }
  return { spaces }
}

function writeStore(userId: string, store: StoredStore): void {
  if (!canUseLocalStorage()) return
  const id = String(userId ?? '').trim()
  if (!id) return
  let next = evictOldestSpaces(store, SPACE_CHAT_MAX_SPACES)
  for (let attempt = 0; attempt < SPACE_CHAT_MAX_SPACES + 1; attempt += 1) {
    try {
      if (Object.keys(next.spaces).length === 0) {
        window.localStorage.removeItem(storageKey(id))
        return
      }
      window.localStorage.setItem(storageKey(id), JSON.stringify(next))
      return
    } catch {
      const remaining = Object.keys(next.spaces).length
      if (remaining <= 1) {
        try {
          window.localStorage.removeItem(storageKey(id))
        } catch {
          /* ignore */
        }
        return
      }
      next = evictOldestSpaces(next, remaining - 1)
    }
  }
}

export function loadSpaceChatLocal(userId: string, spaceId: string, now = Date.now()): SpaceChatMessage[] {
  const sid = String(spaceId ?? '').trim()
  if (!sid) return []
  const rec = readStore(userId).spaces[sid]
  if (!rec) return []
  return pruneSpaceChatMessages(rec.messages, now)
}

export function loadAllSpaceChatLocal(
  userId: string,
  now = Date.now(),
): Record<string, SpaceChatMessage[]> {
  const out: Record<string, SpaceChatMessage[]> = {}
  for (const [spaceId, rec] of Object.entries(readStore(userId).spaces)) {
    const messages = pruneSpaceChatMessages(rec.messages, now)
    if (messages.length) out[spaceId] = messages
  }
  return out
}

export function writeSpaceChatLocal(
  userId: string,
  spaceId: string,
  messages: SpaceChatMessage[],
  now = Date.now(),
): void {
  const sid = String(spaceId ?? '').trim()
  const uid = String(userId ?? '').trim()
  if (!sid || !uid) return
  const pruned = pruneSpaceChatMessages(messages, now)
  const store = readStore(uid)
  if (pruned.length === 0) {
    delete store.spaces[sid]
  } else {
    store.spaces[sid] = { updatedAt: now, messages: pruned }
  }
  writeStore(uid, store)
}

export function clearSpaceChatLocal(userId?: string | null): void {
  if (!canUseLocalStorage()) return
  try {
    const uid = String(userId ?? '').trim()
    if (uid) {
      window.localStorage.removeItem(storageKey(uid))
      return
    }
    const remove: string[] = []
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i)
      if (key?.startsWith(SPACE_CHAT_LOCAL_PREFIX)) remove.push(key)
    }
    for (const key of remove) window.localStorage.removeItem(key)
  } catch {
    /* ignore quota / private mode */
  }
}
