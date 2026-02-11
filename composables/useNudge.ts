export type NudgeSendResponse = {
  sent: boolean
  blocked: boolean
  nextAllowedAt: string | null
}

export function useNudge() {
  const { apiFetchData } = useApiClient()
  const { invalidateUserPreviewCache } = useUserPreview()

  function clearFollowSummaryCache(username: string | null | undefined) {
    const u = (username ?? '').trim().toLowerCase()
    if (!u) return
    // Profile follow summary is cached via useAsyncData('follow-summary:<username>') on /u/:username.
    clearNuxtData(`follow-summary:${u}`)
  }

  async function nudgeUser(username: string): Promise<NudgeSendResponse> {
    const u = (username ?? '').trim()
    if (!u) throw new Error('Username is required')
    const res = await apiFetchData<NudgeSendResponse>(`/follows/${encodeURIComponent(u)}/nudge`, {
      method: 'POST'
    })
    // Hover previews are cached; invalidate so the next hover reflects the new nudge state.
    invalidateUserPreviewCache(u)
    clearFollowSummaryCache(u)
    return res
  }

  async function ackNudge(notificationId: string, opts?: { username?: string | null }): Promise<boolean> {
    const id = (notificationId ?? '').trim()
    if (!id) return false
    const res = await apiFetchData<{ updated: boolean }>(`/notifications/${encodeURIComponent(id)}/mark-read`, {
      method: 'POST'
    })
    clearFollowSummaryCache(opts?.username ?? null)
    return Boolean(res?.updated)
  }

  async function ignoreNudge(notificationId: string, opts?: { username?: string | null }): Promise<boolean> {
    const id = (notificationId ?? '').trim()
    if (!id) return false
    const res = await apiFetchData<{ updated: boolean }>(`/notifications/${encodeURIComponent(id)}/ignore`, {
      method: 'POST'
    })
    clearFollowSummaryCache(opts?.username ?? null)
    return Boolean(res?.updated)
  }

  async function ignoreNudgesByActor(actorUserId: string, opts?: { username?: string | null }): Promise<number> {
    const id = (actorUserId ?? '').trim()
    if (!id) return 0
    const res = await apiFetchData<{ updatedCount: number }>(`/notifications/nudges/${encodeURIComponent(id)}/ignore`, {
      method: 'POST'
    })
    clearFollowSummaryCache(opts?.username ?? null)
    return Math.max(0, Math.floor(res?.updatedCount ?? 0))
  }

  async function markNudgesReadByActor(actorUserId: string, opts?: { username?: string | null }): Promise<number> {
    const id = (actorUserId ?? '').trim()
    if (!id) return 0
    const res = await apiFetchData<{ updatedCount: number }>(`/notifications/nudges/${encodeURIComponent(id)}/mark-read`, {
      method: 'POST'
    })
    clearFollowSummaryCache(opts?.username ?? null)
    return Math.max(0, Math.floor(res?.updatedCount ?? 0))
  }

  async function markNudgeNudgedBackById(notificationId: string, opts?: { username?: string | null }): Promise<boolean> {
    const id = (notificationId ?? '').trim()
    if (!id) return false
    const res = await apiFetchData<{ updated: boolean }>(`/notifications/${encodeURIComponent(id)}/nudged-back`, {
      method: 'POST'
    })
    clearFollowSummaryCache(opts?.username ?? null)
    return Boolean(res?.updated)
  }

  async function markNudgesNudgedBackByActor(actorUserId: string, opts?: { username?: string | null }): Promise<number> {
    const id = (actorUserId ?? '').trim()
    if (!id) return 0
    const res = await apiFetchData<{ updatedCount: number }>(`/notifications/nudges/${encodeURIComponent(id)}/nudged-back`, {
      method: 'POST'
    })
    clearFollowSummaryCache(opts?.username ?? null)
    return Math.max(0, Math.floor(res?.updatedCount ?? 0))
  }

  return {
    nudgeUser,
    ackNudge,
    ignoreNudge,
    ignoreNudgesByActor,
    markNudgesReadByActor,
    markNudgeNudgedBackById,
    markNudgesNudgedBackByActor,
  }
}

