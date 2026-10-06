import { describe, expect, it } from 'vitest'
import { groupSlugFromPath } from '~/utils/group-link'

describe('groupSlugFromPath', () => {
  it('finds the group for group, channel and message links', () => {
    expect(groupSlugFromPath('/g/Men-Of-Hunger')).toBe('men-of-hunger')
    expect(groupSlugFromPath('/groups/men-of-hunger/channels/c1?message=m1')).toBe('men-of-hunger')
  })
  it('ignores non-group and reserved group routes', () => {
    expect(groupSlugFromPath('/u/john')).toBeNull()
    expect(groupSlugFromPath('/groups')).toBeNull()
    expect(groupSlugFromPath('/groups/new')).toBeNull()
  })
})
