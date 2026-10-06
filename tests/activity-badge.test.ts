import { describe, expect, it } from 'vitest'
import { activityBadge } from '~/utils/activity-badge'
import { mergeSwitchableAccountBadges } from '~/utils/switchable-account-badges'
import type { SwitchableAccount } from '~/types/api'

describe('activity badges', () => {
  it('moves from unseen count to unread dot to hidden', () => {
    expect(activityBadge(3, true)).toEqual({ kind: 'count', count: 3 })
    expect(activityBadge(0, true)).toEqual({ kind: 'dot' })
    expect(activityBadge(0, false)).toEqual({ kind: 'hidden' })
    expect(activityBadge(1, true)).toEqual({ kind: 'count', count: 1 })
  })

  it('merges page reads received during a fetch and preserves omitted unread flags', () => {
    const page = { id: 'page', unreadBadgeCount: 5, hasUnreadNotifications: true } as SwitchableAccount
    expect(mergeSwitchableAccountBadges([page], { page: { unreadBadgeCount: 0 } })[0])
      .toMatchObject({ unreadBadgeCount: 0, hasUnreadNotifications: true })
    expect(mergeSwitchableAccountBadges([page], { page: { unreadBadgeCount: 0, hasUnreadNotifications: false } })[0])
      .toMatchObject({ unreadBadgeCount: 0, hasUnreadNotifications: false })
  })
})
