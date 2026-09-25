import { describe, expect, it } from 'vitest'
import {
  isBirthdate18Plus,
  firstIncompleteOnboardingPage,
  isOnboardingFullyComplete,
  isOnboardingPageComplete,
  needsOnboarding,
  nextIncompleteOnboardingPage,
  type OnboardingState,
} from '../utils/onboarding'

const completeUser: OnboardingState = {
  usernameIsSet: true,
  birthdate: '1990-01-15',
  interests: ['strength_training'],
  menOnlyConfirmed: true,
}

describe('needsOnboarding', () => {
  it('allows a user only after required profile fields are complete', () => {
    expect(needsOnboarding(completeUser)).toBe(false)
  })

  it('does not require how-you-heard to leave the gate', () => {
    expect(needsOnboarding({ ...completeUser, heardAboutUs: null })).toBe(false)
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

describe('onboarding pages', () => {
  it('requires username, birthday and community confirmation together', () => {
    expect(isOnboardingPageComplete(1, { usernameIsSet: true })).toBe(false)
    expect(isOnboardingPageComplete(1, completeUser)).toBe(true)
    expect(firstIncompleteOnboardingPage({ ...completeUser, birthdate: null })).toBe(1)
    expect(firstIncompleteOnboardingPage({ ...completeUser, menOnlyConfirmed: false })).toBe(1)
  })
  it('resumes missing arenas and skips previously completed arenas', () => {
    expect(firstIncompleteOnboardingPage({ ...completeUser, interests: [] })).toBe(2)
    expect(nextIncompleteOnboardingPage(1, { ...completeUser, interests: [] })).toBe(2)
    expect(nextIncompleteOnboardingPage(1, completeUser)).toBe(null)
    expect(nextIncompleteOnboardingPage(2, completeUser)).toBe(null)
    expect(isOnboardingFullyComplete(completeUser)).toBe(true)
  })
  it('checks the exact eighteenth birthday and rejects invalid dates', () => {
    const now = new Date('2026-09-24T12:00:00Z')
    expect(isBirthdate18Plus('2008-09-24', now)).toBe(true)
    expect(isBirthdate18Plus('2008-09-25', now)).toBe(false)
    expect(isBirthdate18Plus('2000-02-30', now)).toBe(false)
    expect(isBirthdate18Plus('', now)).toBe(false)
  })
})
