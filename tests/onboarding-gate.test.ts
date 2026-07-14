import { describe, expect, it } from 'vitest'
import { needsOnboarding, type OnboardingState } from '../utils/onboarding'

const completeUser: OnboardingState = {
  usernameIsSet: true,
  birthdate: '1990-01-15',
  interests: ['strength_training'],
  menOnlyConfirmed: true,
}

describe('needsOnboarding', () => {
  it('allows a user only after all required profile fields are complete', () => {
    expect(needsOnboarding(completeUser)).toBe(false)
  })

  it.each([
    ['username', { usernameIsSet: false }],
    ['birthday', { birthdate: null }],
    ['interests', { interests: [] }],
    ['community confirmation', { menOnlyConfirmed: false }],
  ])('blocks when %s is missing', (_label, patch) => {
    expect(needsOnboarding({ ...completeUser, ...patch })).toBe(true)
  })

  it('blocks when there is no authenticated user', () => {
    expect(needsOnboarding(null)).toBe(true)
  })
})
