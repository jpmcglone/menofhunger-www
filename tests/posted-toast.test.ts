import { describe, expect, it } from 'vitest'
import type { FeedPost } from '~/types/api'
import { buildPostedToastParams } from '~/utils/posted-toast'

function post(partial: Partial<FeedPost> & { id: string }): FeedPost {
  return {
    body: '',
    visibility: 'public',
    kind: 'post',
    createdAt: new Date().toISOString(),
    media: [],
    author: {
      id: 'u1',
      username: 'alice',
      name: 'Alice',
      avatarUrl: null,
      premium: false,
      premiumPlus: false,
      isOrganization: false,
      verifiedStatus: 'none',
    },
    boostCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    viewerHasBoosted: false,
    viewerHasBookmarked: false,
    ...partial,
  } as FeedPost
}

describe('buildPostedToastParams', () => {
  it('toasts a public top-level post', () => {
    const t = buildPostedToastParams(post({ id: 'p1' }))
    expect(t.title).toBe('Posted')
    expect(t.message).toContain('Tap to view')
    expect(t.message).toContain('30 min to edit')
    expect(t.to).toBe('/p/p1')
    expect(t.tone).toBe('public')
  })

  it('toasts a reply', () => {
    const t = buildPostedToastParams(post({ id: 'r1', parentId: 'p1' }))
    expect(t.title).toBe('Reply posted')
    expect(t.message).toBe('Tap to view')
  })

  it('toasts a reply when flagged via options', () => {
    const t = buildPostedToastParams(post({ id: 'r2' }), { isReply: true })
    expect(t.title).toBe('Reply posted')
  })

  it('toasts a check-in', () => {
    const t = buildPostedToastParams(post({ id: 'c1', kind: 'checkin' }))
    expect(t.title).toBe('Checked in')
    expect(t.tone).toBe('success')
  })

  it('toasts only-me with onlyMe tone', () => {
    const t = buildPostedToastParams(post({ id: 'o1', visibility: 'onlyMe' }))
    expect(t.title).toBe('Posted')
    expect(t.tone).toBe('onlyMe')
    expect(t.message).toContain('Only you can see this')
    expect(t.message).not.toContain('30 min to edit')
  })

  it('toasts a group post', () => {
    const t = buildPostedToastParams(post({ id: 'g1', communityGroupId: 'grp' }))
    expect(t.tone).toBe('group')
    expect(t.message).toContain('Posted to group')
  })
})
