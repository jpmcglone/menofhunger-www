import type { GetPresenceStatusesData, UserStatus } from '~/types/api'

const PRESENCE_STATUS_BY_USER_ID_KEY = 'presence-status-by-user-id'
const PRESENCE_STATUS_FETCHED_AT_KEY = 'presence-status-fetched-at'
const STATUS_FETCH_TTL_MS = 60_000
let statusExpiryTimer: ReturnType<typeof setTimeout> | null = null
const statusFetchInFlightIds = new Set<string>()

/** Short user status bubbles: shared cache, expiry pruning, REST fetch, and own-status mutations. */
export function usePresenceStatuses() {
  const statusByUserId = useState<Record<string, UserStatus>>(PRESENCE_STATUS_BY_USER_ID_KEY, () => ({}))
  const statusFetchedAtByUserId = useState<Record<string, number>>(PRESENCE_STATUS_FETCHED_AT_KEY, () => ({}))
  const { user } = useAuth()
  const { apiFetchData } = useApiClient()

  function isStatusActive(status: UserStatus | null | undefined): status is UserStatus {
    if (!status?.userId || !status.text) return false
    const expiresAtMs = Date.parse(status.expiresAt)
    return Number.isFinite(expiresAtMs) && expiresAtMs > Date.now()
  }

  function applyUserStatus(status: UserStatus | null | undefined) {
    const uid = status?.userId
    if (!uid) return
    const next = { ...statusByUserId.value }
    if (isStatusActive(status)) next[uid] = status
    else delete next[uid]
    statusByUserId.value = next
    statusFetchedAtByUserId.value = {
      ...statusFetchedAtByUserId.value,
      [uid]: Date.now(),
    }
    scheduleStatusExpiryPrune()
  }

  function clearUserStatus(userId: string) {
    const uid = String(userId ?? '').trim()
    if (!uid) return
    const next = { ...statusByUserId.value }
    delete next[uid]
    statusByUserId.value = next
    statusFetchedAtByUserId.value = {
      ...statusFetchedAtByUserId.value,
      [uid]: Date.now(),
    }
    scheduleStatusExpiryPrune()
  }

  function getUserStatus(userId: string): UserStatus | null {
    const uid = String(userId ?? '').trim()
    if (!uid) return null
    const status = statusByUserId.value[uid] ?? null
    if (!isStatusActive(status)) return null
    return status
  }

  function pruneExpiredStatuses() {
    const next = { ...statusByUserId.value }
    let changed = false
    for (const [uid, status] of Object.entries(next)) {
      if (!isStatusActive(status)) {
        delete next[uid]
        changed = true
      }
    }
    if (changed) statusByUserId.value = next
  }

  function scheduleStatusExpiryPrune() {
    if (!import.meta.client) return
    if (statusExpiryTimer) {
      clearTimeout(statusExpiryTimer)
      statusExpiryTimer = null
    }

    const now = Date.now()
    let nextExpiryMs = Number.POSITIVE_INFINITY
    for (const status of Object.values(statusByUserId.value)) {
      const expiresAtMs = Date.parse(status.expiresAt)
      if (Number.isFinite(expiresAtMs) && expiresAtMs > now) {
        nextExpiryMs = Math.min(nextExpiryMs, expiresAtMs)
      }
    }
    if (!Number.isFinite(nextExpiryMs)) return

    statusExpiryTimer = setTimeout(() => {
      statusExpiryTimer = null
      pruneExpiredStatuses()
      scheduleStatusExpiryPrune()
    }, Math.max(0, nextExpiryMs - now + 50))
  }

  function addStatusesFromRest(statuses: Array<UserStatus | null | undefined>) {
    for (const status of statuses) {
      if (status?.userId) applyUserStatus(status)
    }
  }

  async function fetchStatusesForUsers(userIds: string[]) {
    if (!import.meta.client) return
    const now = Date.now()
    const ids = Array.from(new Set((userIds ?? []).map((id) => String(id ?? '').trim()).filter(Boolean)))
      .filter((id) => now - (statusFetchedAtByUserId.value[id] ?? 0) > STATUS_FETCH_TTL_MS)
      .filter((id) => !statusFetchInFlightIds.has(id))
      .slice(0, 100)
    if (ids.length === 0) return
    for (const id of ids) statusFetchInFlightIds.add(id)
    try {
      const statuses = await apiFetchData<GetPresenceStatusesData>('/presence/statuses', {
        method: 'GET',
        query: { userIds: ids.join(',') },
        mohCache: false,
      })
      const returnedIds = new Set((statuses ?? []).map((status) => status.userId))
      for (const status of statuses ?? []) applyUserStatus(status)
      for (const id of ids) {
        if (!returnedIds.has(id)) clearUserStatus(id)
      }
    } catch {
      // Status bubbles are contextual; presence itself should not fail if this fetch does.
    } finally {
      for (const id of ids) statusFetchInFlightIds.delete(id)
    }
  }

  async function setMyStatus(
    text: string,
    opts?: { durationHours?: 1 | 3 | 6 | 12 | 24; createsPost?: boolean },
  ): Promise<UserStatus> {
    const cleanText = String(text ?? '').trim()
    const status = await apiFetchData<UserStatus>('/presence/status', {
      method: 'PUT',
      body: {
        text: cleanText,
        durationHours: opts?.durationHours ?? 24,
        createsPost: opts?.createsPost ?? true,
      },
    })
    applyUserStatus(status)
    return status
  }

  async function editMyStatus(text: string): Promise<UserStatus> {
    const cleanText = String(text ?? '').trim()
    const status = await apiFetchData<UserStatus>('/presence/status', {
      method: 'PATCH',
      body: { text: cleanText },
    })
    applyUserStatus(status)
    return status
  }

  async function clearMyStatus(): Promise<void> {
    await apiFetchData<{ cleared: true }>('/presence/status', { method: 'DELETE' })
    const id = user.value?.id
    if (id) clearUserStatus(id)
  }

  return {
    statusByUserId,
    applyUserStatus,
    clearUserStatus,
    getUserStatus,
    addStatusesFromRest,
    fetchStatusesForUsers,
    setMyStatus,
    editMyStatus,
    clearMyStatus,
  }
}
