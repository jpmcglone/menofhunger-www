import { describe, expect, it } from 'vitest'
import { isPersonOnlyPath, personOnlyFeatureForPath } from '~/utils/person-only-routes'

describe('person-only routes', () => {
  it('labels the personal surfaces a page should not use', () => {
    expect(personOnlyFeatureForPath('/check-ins/trending')).toBe('Check-ins')
    expect(personOnlyFeatureForPath('/fitness')).toBe('Fitness')
    expect(personOnlyFeatureForPath('/crew')).toBe('Crew')
    expect(personOnlyFeatureForPath('/coins/tx-1')).toBe('Coins')
    expect(personOnlyFeatureForPath('/settings/billing')).toBe('Billing')
    expect(personOnlyFeatureForPath('/admin/users')).toBe('Admin')
    expect(personOnlyFeatureForPath('/daily')).toBe('Daily')
    expect(personOnlyFeatureForPath('/daily/word')).toBe('Daily')
    expect(personOnlyFeatureForPath('/daily/quote')).toBe('Daily')
  })

  it('leaves page-owned surfaces alone', () => {
    expect(isPersonOnlyPath('/home')).toBe(false)
    expect(isPersonOnlyPath('/settings')).toBe(false)
    expect(isPersonOnlyPath('/settings/account')).toBe(false)
    expect(isPersonOnlyPath('/chat')).toBe(false)
    expect(isPersonOnlyPath('/groups')).toBe(false)
  })
})
