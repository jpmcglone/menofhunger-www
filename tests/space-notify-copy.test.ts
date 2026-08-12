import { describe, expect, it } from 'vitest'
import { spaceNotifySignupTooltip } from '../utils/space-notify-copy'

describe('spaceNotifySignupTooltip', () => {
  it('describes signups as future reminders, not past notifications', () => {
    expect(spaceNotifySignupTooltip(0)).toMatch(/signed up for a reminder yet/i)
    expect(spaceNotifySignupTooltip(1)).toMatch(/^1 person signed up for a reminder/)
    expect(spaceNotifySignupTooltip(2)).toMatch(/^2 people signed up for a reminder/)
    expect(spaceNotifySignupTooltip(2)).not.toMatch(/notified/i)
  })
})
