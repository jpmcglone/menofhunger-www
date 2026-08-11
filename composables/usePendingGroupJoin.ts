/**
 * Persist intent to join a group across login → verify → return,
 * mirroring referral capture. Used by personalized `/g/{slug}?from=&ref=` links.
 */
const PENDING_GROUP_KEY = 'moh.pendingGroupJoin.v1'

export function usePendingGroupJoin() {
  const pendingSlug = useState<string>('pending-group-join-slug', () => '')

  function loadStored() {
    if (!import.meta.client) return
    if (!pendingSlug.value) {
      const stored = String(window.localStorage.getItem(PENDING_GROUP_KEY) ?? '').trim()
      if (stored) pendingSlug.value = stored
    }
  }

  function setPendingGroupJoin(slug: string | null | undefined) {
    const s = String(slug ?? '').trim()
    pendingSlug.value = s
    if (!import.meta.client) return
    if (s) window.localStorage.setItem(PENDING_GROUP_KEY, s)
    else window.localStorage.removeItem(PENDING_GROUP_KEY)
  }

  function clearPendingGroupJoin() {
    setPendingGroupJoin(null)
  }

  function consumePendingGroupJoin(): string | null {
    loadStored()
    const s = pendingSlug.value.trim()
    if (!s) return null
    clearPendingGroupJoin()
    return s
  }

  loadStored()

  return {
    pendingSlug: readonly(pendingSlug),
    setPendingGroupJoin,
    clearPendingGroupJoin,
    consumePendingGroupJoin,
    loadStored,
  }
}
