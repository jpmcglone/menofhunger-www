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

function mergeDefined<T extends Record<string, any>>(prev: T, next: Partial<T>): T {
  const out: any = { ...prev }
  for (const k of Object.keys(next) as Array<keyof T>) {
    const v = next[k]
    if (v !== undefined) out[k] = v
  }
  return out
}

function shallowEqual(a: Record<string, any>, b: Record<string, any>): boolean {
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
    const id = String(user?.id ?? '').trim()
    if (!id) return
    const prev = byId.value[id] ?? {}
    const merged = mergeDefined(prev, user as any)
    // IMPORTANT: avoid infinite reactive loops by never reassigning if nothing actually changed.
    if (shallowEqual(prev as any, merged as any)) return
    byId.value = { ...byId.value, [id]: merged }
  }

  function get(userId: string | null | undefined): Partial<PublicUserEntity> | null {
    const id = String(userId ?? '').trim()
    if (!id) return null
    return byId.value[id] ?? null
  }

  function overlay<T extends { id?: string | null }>(snapshot: T): T {
    const id = String((snapshot as any)?.id ?? '').trim()
    if (!id) return snapshot
    const cached = byId.value[id]
    if (!cached) return snapshot
    return { ...(snapshot as any), ...(cached as any) }
  }

  return { byId, upsert, get, overlay }
}

