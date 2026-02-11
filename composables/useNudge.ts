export type NudgeSendResponse = {
  sent: boolean
  blocked: boolean
  nextAllowedAt: string | null
}

export function useNudge() {
  const { apiFetchData } = useApiClient()

  async function nudgeUser(username: string): Promise<NudgeSendResponse> {
    const u = (username ?? '').trim()
    if (!u) throw new Error('Username is required')
    return await apiFetchData<NudgeSendResponse>(`/follows/${encodeURIComponent(u)}/nudge`, {
      method: 'POST'
    })
  }

  async function ackNudge(notificationId: string): Promise<boolean> {
    const id = (notificationId ?? '').trim()
    if (!id) return false
    const res = await apiFetchData<{ updated: boolean }>(`/notifications/${encodeURIComponent(id)}/mark-read`, {
      method: 'POST'
    })
    return Boolean(res?.updated)
  }

  async function ignoreNudge(notificationId: string): Promise<boolean> {
    const id = (notificationId ?? '').trim()
    if (!id) return false
    const res = await apiFetchData<{ updated: boolean }>(`/notifications/${encodeURIComponent(id)}/ignore`, {
      method: 'POST'
    })
    return Boolean(res?.updated)
  }

  async function ignoreNudgesByActor(actorUserId: string): Promise<number> {
    const id = (actorUserId ?? '').trim()
    if (!id) return 0
    const res = await apiFetchData<{ updatedCount: number }>(`/notifications/nudges/${encodeURIComponent(id)}/ignore`, {
      method: 'POST'
    })
    return Math.max(0, Math.floor(res?.updatedCount ?? 0))
  }

  async function markNudgesReadByActor(actorUserId: string): Promise<number> {
    const id = (actorUserId ?? '').trim()
    if (!id) return 0
    const res = await apiFetchData<{ updatedCount: number }>(`/notifications/nudges/${encodeURIComponent(id)}/mark-read`, {
      method: 'POST'
    })
    return Math.max(0, Math.floor(res?.updatedCount ?? 0))
  }

  async function markNudgeNudgedBackById(notificationId: string): Promise<boolean> {
    const id = (notificationId ?? '').trim()
    if (!id) return false
    const res = await apiFetchData<{ updated: boolean }>(`/notifications/${encodeURIComponent(id)}/nudged-back`, {
      method: 'POST'
    })
    return Boolean(res?.updated)
  }

  async function markNudgesNudgedBackByActor(actorUserId: string): Promise<number> {
    const id = (actorUserId ?? '').trim()
    if (!id) return 0
    const res = await apiFetchData<{ updatedCount: number }>(`/notifications/nudges/${encodeURIComponent(id)}/nudged-back`, {
      method: 'POST'
    })
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

