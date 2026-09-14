import { describe, expect, it } from 'vitest'
import { userNotificationPreference } from '~/utils/user-notification-preference'
import { hydrateFollowRelationship } from '~/utils/follow-relationship'

describe('author notification preferences', () => {
  const base = { viewerFollowsUser: true, userFollowsViewer: false, viewerPostNotificationsEnabled: false }
  it.each(['all', 'posts', 'off'] as const)('honors explicit %s over the legacy reply bell', mode => {
    expect(userNotificationPreference({ ...base, viewerNotificationPreference: mode })).toBe(mode)
  })
  it('preserves the previous meaning of the old reply bell', () => {
    expect(userNotificationPreference(base)).toBe('posts')
    expect(userNotificationPreference({ ...base, viewerPostNotificationsEnabled: true })).toBe('all')
    expect(userNotificationPreference({ ...base, viewerFollowsUser: false })).toBe('off')
  })
  it('does not overwrite a saved mute with an older list payload', () => {
    expect(hydrateFollowRelationship({ ...base, viewerNotificationPreference: 'off' }, base)?.viewerNotificationPreference).toBe('off')
  })
  it('accepts an explicit changed preference from a fresh payload', () => {
    expect(hydrateFollowRelationship({ ...base, viewerNotificationPreference: 'off' }, { ...base, viewerNotificationPreference: 'all' })?.viewerNotificationPreference).toBe('all')
  })
})
