import { describe, expect, it } from 'vitest'
import type { Space } from '~/types/api'
import { compareLobbySpaces, isScheduledNotifySpace, mergeLobbyRefresh, sortLobbySpaces } from '~/utils/spacesLobbySort'

function space(partial: Partial<Space> & { id: string }): Space {
  return {
    title: partial.id,
    description: null,
    isActive: false,
    scheduledAt: null,
    mode: 'NONE',
    watchPartyUrl: null,
    radioStreamUrl: null,
    playbackTitle: null,
    owner: { id: 'other', username: 'other', avatarUrl: null, premium: false, premiumPlus: false, isOrganization: false, verifiedStatus: 'none' },
    listenerCount: 0,
    viewerSubscribed: false,
    subscriberCount: 0,
    viewerFollowsOwner: false,
    ...partial,
  }
}

describe('sortLobbySpaces', () => {
  it('orders own → notifying → following → soonest schedule', () => {
    const viewerId = 'me'
    const list = [
      space({ id: 'later', scheduledAt: '2026-08-30T00:00:00.000Z' }),
      space({ id: 'soon', scheduledAt: '2026-08-15T00:00:00.000Z' }),
      space({
        id: 'follow',
        owner: { id: 'friend', username: 'friend', avatarUrl: null, premium: false, premiumPlus: false, isOrganization: false, verifiedStatus: 'none' },
        viewerFollowsOwner: true,
        scheduledAt: '2026-08-22T00:00:00.000Z',
      }),
      space({ id: 'notify', viewerSubscribed: true, scheduledAt: '2026-08-21T00:00:00.000Z' }),
      space({
        id: 'own',
        owner: { id: viewerId, username: 'me', avatarUrl: null, premium: false, premiumPlus: false, isOrganization: false, verifiedStatus: 'none' },
        scheduledAt: '2026-08-20T00:00:00.000Z',
      }),
    ]
    expect(sortLobbySpaces(list, viewerId).map((s) => s.id)).toEqual([
      'own',
      'notify',
      'follow',
      'soon',
      'later',
    ])
  })

  it('ranks a live room above an unfollowed scheduled space', () => {
    const live = space({ id: 'live', isActive: true, listenerCount: 2 })
    const soon = space({ id: 'soon', scheduledAt: '2026-08-15T00:00:00.000Z' })
    expect(sortLobbySpaces([soon, live], 'me').map((s) => s.id)).toEqual(['live', 'soon'])
  })

  it('compareLobbySpaces ranks notifying above following', () => {
    const a = space({ id: 'notify', viewerSubscribed: true, scheduledAt: '2026-08-28T00:00:00.000Z' })
    const b = space({ id: 'follow', viewerFollowsOwner: true, scheduledAt: '2026-08-10T00:00:00.000Z' })
    expect(compareLobbySpaces(a, b, 'me')).toBeLessThan(0)
  })
})

describe('isScheduledNotifySpace', () => {
  it('is true only for upcoming scheduled + subscribed', () => {
    const now = Date.parse('2026-08-11T12:00:00.000Z')
    expect(isScheduledNotifySpace(
      space({ id: 'a', viewerSubscribed: true, scheduledAt: '2026-08-14T00:00:00.000Z' }),
      now,
    )).toBe(true)
    expect(isScheduledNotifySpace(
      space({ id: 'b', viewerSubscribed: true, isActive: true, scheduledAt: '2026-08-14T00:00:00.000Z' }),
      now,
    )).toBe(false)
    expect(isScheduledNotifySpace(
      space({ id: 'c', viewerSubscribed: false, scheduledAt: '2026-08-14T00:00:00.000Z' }),
      now,
    )).toBe(false)
  })
})

describe('mergeLobbyRefresh', () => {
  it('keeps a live room the server omitted so it cannot fade out', () => {
    const live = space({ id: 'john', isActive: true })
    const scheduled = space({ id: 'soon', scheduledAt: '2026-08-16T00:00:00.000Z' })
    expect(mergeLobbyRefresh([scheduled], [live, scheduled]).map((s) => s.id)).toEqual(['soon', 'john'])
  })

  it('does not keep idle rooms the server dropped', () => {
    const idle = space({ id: 'idle', isActive: false })
    expect(mergeLobbyRefresh([], [idle])).toEqual([])
  })
})
