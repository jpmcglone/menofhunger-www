import type {
  CrewBySlugResponse,
  CrewInvite,
  CrewPrivate,
  CrewPublic,
} from '~/types/api'

type ApiFetchData = ReturnType<typeof useApiClient>['apiFetchData']

/**
 * Minimal typed wrappers around the Crew HTTP API. Kept intentionally small —
 * the chat side of the crew rides on top of the regular /messages endpoints
 * (the crew chat is a `MessageConversation` of type `crew_wall`).
 */
export function useCrew() {
  const { apiFetchData } = useApiClient()

  async function getMyCrew(): Promise<CrewPrivate | null> {
    const res = await apiFetchData<{ crew: CrewPrivate | null }>('/crew/me')
    return res?.crew ?? null
  }

  async function updateMyCrew(patch: Partial<{
    name: string | null
    tagline: string | null
    bio: string | null
    avatarImageUrl: string | null
    coverImageUrl: string | null
    designatedSuccessorUserId: string | null
  }>): Promise<CrewPrivate> {
    const res = await apiFetchData<{ crew: CrewPrivate }>('/crew/me', {
      method: 'PATCH',
      body: patch,
    })
    return res.crew
  }

  /**
   * Edit any crew by id. Owners can use this in place of `updateMyCrew`; the
   * primary caller is the site-admin "Edit Crew" path on `/c/:slug` (admins
   * who are not members of the crew). The API enforces owner-or-admin and
   * returns the same {@link CrewPrivate} shape so the dialog can patch local
   * state without an extra fetch.
   */
  async function updateCrew(
    crewId: string,
    patch: Partial<{
      name: string | null
      tagline: string | null
      bio: string | null
      avatarImageUrl: string | null
      coverImageUrl: string | null
      designatedSuccessorUserId: string | null
    }>,
  ): Promise<CrewPrivate> {
    const res = await apiFetchData<{ crew: CrewPrivate }>(`/crew/${encodeURIComponent(crewId)}`, {
      method: 'PATCH',
      body: patch,
    })
    return res.crew
  }

  async function leaveCrew(): Promise<void> {
    await apiFetchData('/crew/me/leave', { method: 'POST', body: {} })
  }

  async function disbandCrew(): Promise<void> {
    await apiFetchData('/crew/me', { method: 'DELETE' })
  }

  async function kickMember(userId: string): Promise<void> {
    await apiFetchData(`/crew/me/members/${encodeURIComponent(userId)}`, { method: 'DELETE' })
  }

  async function reorderMembers(userIdOrder: string[]): Promise<void> {
    await apiFetchData('/crew/me/members/order', { method: 'PATCH', body: { order: userIdOrder } })
  }

  async function sendInvite(params: {
    inviteeUserId: string
    message?: string | null
    /** Founding invites only — name to seed the crew with on acceptance. Ignored for existing crews. */
    crewName?: string | null
  }): Promise<CrewInvite> {
    const res = await apiFetchData<{ invite: CrewInvite }>('/crew/invites', {
      method: 'POST',
      body: {
        inviteeUserId: params.inviteeUserId,
        message: params.message ?? null,
        crewName: params.crewName ?? null,
      },
    })
    return res.invite
  }

  async function listInbox(): Promise<CrewInvite[]> {
    const res = await apiFetchData<CrewInvite[]>('/crew/invites/inbox')
    return Array.isArray(res) ? res : []
  }

  async function listOutbox(): Promise<CrewInvite[]> {
    const res = await apiFetchData<CrewInvite[]>('/crew/invites/outbox')
    return Array.isArray(res) ? res : []
  }

  async function acceptInvite(inviteId: string): Promise<{ crewId: string }> {
    return await apiFetchData<{ crewId: string }>(`/crew/invites/${encodeURIComponent(inviteId)}/accept`, {
      method: 'POST',
      body: {},
    })
  }

  async function declineInvite(inviteId: string): Promise<void> {
    await apiFetchData(`/crew/invites/${encodeURIComponent(inviteId)}/decline`, { method: 'POST', body: {} })
  }

  async function cancelInvite(inviteId: string): Promise<void> {
    await apiFetchData(`/crew/invites/${encodeURIComponent(inviteId)}`, { method: 'DELETE' })
  }

  async function getCrewBySlug(slug: string): Promise<CrewBySlugResponse> {
    return await apiFetchData<CrewBySlugResponse>(
      `/crew/by-slug/${encodeURIComponent(slug)}`,
    )
  }

  async function getCrewForUser(userId: string): Promise<CrewPublic | null> {
    const res = await apiFetchData<{ crew: CrewPublic | null }>(`/crew/for-user/${encodeURIComponent(userId)}`)
    return res?.crew ?? null
  }

  async function transferOwnership(newOwnerUserId: string): Promise<void> {
    await apiFetchData('/crew/me/transfer', { method: 'POST', body: { newOwnerUserId } })
  }

  async function openTransferVote(targetUserId: string): Promise<{ voteId: string; status: string }> {
    return await apiFetchData<{ voteId: string; status: string }>('/crew/me/transfer-votes', {
      method: 'POST',
      body: { targetUserId },
    })
  }

  async function castTransferBallot(voteId: string, inFavor: boolean): Promise<void> {
    await apiFetchData(`/crew/me/transfer-votes/${encodeURIComponent(voteId)}/ballot`, {
      method: 'POST',
      body: { inFavor },
    })
  }

  async function cancelTransferVote(voteId: string): Promise<void> {
    await apiFetchData(`/crew/me/transfer-votes/${encodeURIComponent(voteId)}`, { method: 'DELETE' })
  }

  return {
    getMyCrew,
    updateMyCrew,
    updateCrew,
    leaveCrew,
    disbandCrew,
    kickMember,
    reorderMembers,
    sendInvite,
    listInbox,
    listOutbox,
    acceptInvite,
    declineInvite,
    cancelInvite,
    getCrewBySlug,
    getCrewForUser,
    transferOwnership,
    openTransferVote,
    castTransferBallot,
    cancelTransferVote,
  }
}

export function crewDisplayName(crew: Pick<CrewPublic, 'name'> | null | undefined): string {
  if (!crew) return ''
  const n = (crew.name ?? '').trim()
  return n.length > 0 ? n : 'Untitled Crew'
}
