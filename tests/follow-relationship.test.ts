import { describe, expect, it } from 'vitest'
import { hydrateFollowRelationship } from '~/utils/follow-relationship'

const following = {
  viewerFollowsUser: true,
  userFollowsViewer: false,
  viewerPostNotificationsEnabled: true,
}
const notFollowing = {
  viewerFollowsUser: false,
  userFollowsViewer: false,
  viewerPostNotificationsEnabled: false,
}

describe('hydrateFollowRelationship', () => {
  it('keeps a known follow when the incoming payload says not following', () => {
    expect(hydrateFollowRelationship(following, notFollowing)).toEqual(following)
  })

  it('accepts a follow when the store was empty or not-following', () => {
    expect(hydrateFollowRelationship(null, following)).toEqual(following)
    expect(hydrateFollowRelationship(notFollowing, following)).toEqual(following)
  })

  it('keeps the existing row when the incoming payload has no relationship', () => {
    expect(hydrateFollowRelationship(following, null)).toEqual(following)
    expect(hydrateFollowRelationship(following, undefined)).toEqual(following)
  })
})
