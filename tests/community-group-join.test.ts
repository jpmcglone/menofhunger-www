import { describe, expect, it } from 'vitest'
import {
  applyCommunityGroupJoin,
  communityGroupJoinToast,
} from '~/utils/community-group-preview'

const group = {
  viewerMembership: null as { status: 'active' | 'pending'; role: 'owner' | 'moderator' | 'member' } | null,
  viewerPendingApproval: false,
  memberCount: 10,
}

describe('applyCommunityGroupJoin', () => {
  it('marks the viewer as an active member and bumps the count', () => {
    const next = applyCommunityGroupJoin(group, 'active')
    expect(next.viewerMembership).toEqual({ status: 'active', role: 'member' })
    expect(next.viewerPendingApproval).toBe(false)
    expect(next.memberCount).toBe(11)
  })

  it('marks a pending request without incrementing members', () => {
    const next = applyCommunityGroupJoin(group, 'pending')
    expect(next.viewerMembership).toBeNull()
    expect(next.viewerPendingApproval).toBe(true)
    expect(next.memberCount).toBe(10)
  })

  it('does not double-count an already-active member', () => {
    const next = applyCommunityGroupJoin(
      { ...group, viewerMembership: { status: 'active', role: 'member' }, memberCount: 11 },
      'active',
    )
    expect(next.memberCount).toBe(11)
  })
})

describe('communityGroupJoinToast', () => {
  it('names the group on a successful join', () => {
    expect(communityGroupJoinToast('active', 'Dawn Patrol').title).toBe("You're in Dawn Patrol")
  })

  it('uses request-sent copy for approval groups', () => {
    expect(communityGroupJoinToast('pending', 'Dawn Patrol').title).toBe('Request sent')
  })
})
