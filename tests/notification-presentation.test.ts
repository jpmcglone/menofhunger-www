import { describe, expect, it } from 'vitest'
import { notificationPresentation, notificationShowsActor } from '../utils/notification-presentation'

describe('notification presentation', () => {
  it('distinguishes boosts, reposts, and follows by event meaning', () => {
    const events = ['boost', 'repost', 'follow'].map(kind => notificationPresentation(kind))
    expect(new Set(events.map(event => event.icon)).size).toBe(3)
    expect(events.every(event => event.color === 'moh-text-muted')).toBe(true)
    expect(events[0]?.icon).toBe('tabler:arrow-big-up-filled')
    expect(events[1]?.icon).toBe('tabler:repeat')
    expect(events[2]?.icon).toBe('tabler:user-filled')
  })

  it('shows actors for social activity and no fake avatar for system updates', () => {
    for (const kind of ['follow', 'boost', 'repost', 'status_update', 'crew_invite_received']) {
      expect(notificationShowsActor(kind)).toBe(true)
    }
    for (const kind of ['account_verified', 'checkin_reminder', 'premium_started', 'poll_results_ready', 'generic']) {
      expect(notificationShowsActor(kind)).toBe(false)
    }
  })

  it('uses the acting member tier and keeps mixed groups neutral', () => {
    expect(notificationPresentation('boost', [{ premium: true }]).color).toBe('text-[var(--moh-premium)]')
    expect(notificationPresentation('repost', [{ verifiedStatus: 'verified' }]).color).toBe('text-[var(--moh-verified)]')
    expect(notificationPresentation('comment', [{ premium: true, isOrganization: true }]).color).toBe('text-[var(--moh-org)]')
    expect(notificationPresentation('boost', [{ premium: true }, {}]).color).toBe('moh-text-muted')
  })

  it('gives unfamiliar events a neutral fallback', () => {
    expect(notificationPresentation('future_event')).toEqual({ icon: 'tabler:bell-filled', color: 'moh-text-muted' })
  })
})
