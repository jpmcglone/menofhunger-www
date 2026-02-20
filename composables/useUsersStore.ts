export type PublicUserEntity = {
  id: string
  username: string | null
  name: string | null
  bio?: string | null
  premium?: boolean
  premiumPlus?: boolean
  verifiedStatus?: string
  avatarUrl?: string | null
  bannerUrl?: string | null
  pinnedPostId?: string | null
  lastOnlineAt?: string | null
}

type UsersById = Record<string, Partial<PublicUserEntity>>

function mergeDefined<T extends Record<string, unknown>>(prev: T, next: Partial<T>): T {
  const out = { ...prev }
  for (const k of Object.keys(next) as Array<keyof T>) {
    const v = next[k]
    if (v !== undefined) out[k] = v as T[typeof k]
  }
  return out as T
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false
  for (const k of aKeys) {
    if (a[k] !== b[k]) return false
  }
  return true
}

/**
 * Normalized users entity store (public display fields).
 *
 * Goal: when a user's public info changes (avatar/name/tier), the UI updates everywhere
 * without refetching every feed/list that embedded a stale user snapshot.
 */
export function useUsersStore() {
  const byId = useState<UsersById>('users-by-id', () => ({}))

  function upsert(user: Partial<PublicUserEntity> | null | undefined) {
    if (!user) return
    const id = String(user?.id ?? '').trim()
    if (!id) return
    const prev = byId.value[id] ?? {}
    const merged = mergeDefined(prev, user)
    // IMPORTANT: avoid infinite reactive loops by never reassigning if nothing actually changed.
    if (shallowEqual(prev, merged)) return
    byId.value = { ...byId.value, [id]: merged }
  }

  function get(userId: string | null | undefined): Partial<PublicUserEntity> | null {
    const id = String(userId ?? '').trim()
    if (!id) return null
    return byId.value[id] ?? null
  }

  function overlay<T extends { id?: string | null }>(snapshot: T): T {
    const id = String(snapshot?.id ?? '').trim()
    if (!id) return snapshot
    const cached = byId.value[id]
    if (!cached) return snapshot
    return { ...snapshot, ...cached } as T
  }

  return { byId, upsert, get, overlay }
}

