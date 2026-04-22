import type {
  CommunityGroupInvitableUser,
  CommunityGroupInvite,
} from '~/types/api'

/**
 * Typed wrappers around the community-group invite API.
 *
 * Mirrors `useCrew()`'s invite surface (send / accept / decline / cancel /
 * inbox) but adds a server-side picker (`/groups/:id/invitable-users`) that
 * returns rich invite-status hints so the inviter UI can show "Already a
 * member", "Pending invite", or "Declined — try again on Mar 14" without
 * having to reconcile state on the client.
 */
export function useGroupInvites() {
  const { apiFetchData } = useApiClient()

  /** Pending invites issued for `groupId` (owner/mod view). */
  async function listGroupInvites(groupId: string): Promise<CommunityGroupInvite[]> {
    const res = await apiFetchData<CommunityGroupInvite[]>(
      `/groups/${encodeURIComponent(groupId)}/invites`,
    )
    return Array.isArray(res) ? res : []
  }

  /** Pending group invites in the viewer's own inbox. */
  async function listInbox(): Promise<CommunityGroupInvite[]> {
    const res = await apiFetchData<CommunityGroupInvite[]>('/groups/invites/inbox')
    return Array.isArray(res) ? res : []
  }

  /**
   * Search users the inviter could add. Empty `q` returns recent signups so the
   * picker is useful before typing. The server annotates each row with an
   * `inviteStatus` so the UI can hint at relationship/cooldown.
   */
  async function listInvitableUsers(params: {
    groupId: string
    q?: string | null
    limit?: number
  }): Promise<CommunityGroupInvitableUser[]> {
    const query: Record<string, string | number> = {}
    if (params.q && params.q.trim().length > 0) query.q = params.q.trim()
    if (params.limit) query.limit = params.limit
    const res = await apiFetchData<CommunityGroupInvitableUser[]>(
      `/groups/${encodeURIComponent(params.groupId)}/invitable-users`,
      { query },
    )
    return Array.isArray(res) ? res : []
  }

  async function sendInvite(params: {
    groupId: string
    inviteeUserId: string
    message?: string | null
  }): Promise<{ invite: CommunityGroupInvite; resent: boolean; notified: boolean }> {
    return await apiFetchData<{
      invite: CommunityGroupInvite
      resent: boolean
      notified: boolean
    }>(`/groups/${encodeURIComponent(params.groupId)}/invites`, {
      method: 'POST',
      body: {
        inviteeUserId: params.inviteeUserId,
        message: params.message ?? null,
      },
    })
  }

  async function cancelInvite(params: { groupId: string; inviteId: string }): Promise<void> {
    await apiFetchData(
      `/groups/${encodeURIComponent(params.groupId)}/invites/${encodeURIComponent(params.inviteId)}`,
      { method: 'DELETE' },
    )
  }

  async function acceptInvite(inviteId: string): Promise<{ groupId: string; groupSlug: string }> {
    return await apiFetchData<{ groupId: string; groupSlug: string }>(
      `/groups/invites/${encodeURIComponent(inviteId)}/accept`,
      { method: 'POST', body: {} },
    )
  }

  async function declineInvite(inviteId: string): Promise<void> {
    await apiFetchData(`/groups/invites/${encodeURIComponent(inviteId)}/decline`, {
      method: 'POST',
      body: {},
    })
  }

  return {
    listGroupInvites,
    listInbox,
    listInvitableUsers,
    sendInvite,
    cancelInvite,
    acceptInvite,
    declineInvite,
  }
}
