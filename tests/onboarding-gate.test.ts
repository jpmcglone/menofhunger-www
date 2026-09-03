import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
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
  it('treats page 1 as complete once a username is set', () => {
    expect(isOnboardingPageComplete(1, { usernameIsSet: false })).toBe(false)
    expect(isOnboardingPageComplete(1, { usernameIsSet: true })).toBe(true)
    expect(isOnboardingPageComplete(1, { usernameIsSet: true, heardAboutUs: null })).toBe(true)
  })

  it('lands on the first incomplete page', () => {
    expect(firstIncompleteOnboardingPage({
      usernameIsSet: false,
      interests: ['strength_training'],
      menOnlyConfirmed: false,
    })).toBe(1)

    expect(firstIncompleteOnboardingPage({
      usernameIsSet: true,
      interests: [],
      birthdate: null,
      menOnlyConfirmed: false,
    })).toBe(2)

    expect(firstIncompleteOnboardingPage({
      usernameIsSet: true,
      interests: ['strength_training'],
      birthdate: null,
      menOnlyConfirmed: false,
    })).toBe(3)
  })

  it('skips a completed interests page when moving forward', () => {
    const user: OnboardingState = {
      usernameIsSet: true,
      interests: ['strength_training'],
      birthdate: null,
      menOnlyConfirmed: false,
    }
    expect(nextIncompleteOnboardingPage(1, user)).toBe(3)
    expect(nextIncompleteOnboardingPage(3, user)).toBe(null)
  })

  it('does not treat the last page as done when arenas are still missing', () => {
    const user: OnboardingState = {
      usernameIsSet: true,
      interests: [],
      birthdate: '1990-01-15',
      menOnlyConfirmed: true,
    }
    expect(isOnboardingFullyComplete(user)).toBe(false)
    expect(firstIncompleteOnboardingPage(user)).toBe(2)
    expect(nextIncompleteOnboardingPage(3, user)).toBe(null)
    expect(isOnboardingFullyComplete(completeUser)).toBe(true)
  })
})

describe('OnboardingGate pager', () => {
  const src = readFileSync(resolve(process.cwd(), 'components/app/OnboardingGate.vue'), 'utf8')

  it('is a three-page flow with back and per-page save', () => {
    expect(src).toMatch(/v-show="page === 1"/)
    expect(src).toMatch(/v-show="page === 2"/)
    expect(src).toMatch(/v-show="page === 3"/)
    expect(src).toMatch(/function goBack/)
    expect(src).toMatch(/saveAccountPage/)
    expect(src).toMatch(/saveInterestsPage/)
    expect(src).toMatch(/saveDoorPage/)
    expect(src).toMatch(/startAfterOnboarding/)
    expect(src).toMatch(/navigateTo\('\/home'/)
    expect(src).not.toMatch(/pending-edit-profile/)
    expect(src).not.toMatch(/\/u\/\$\{encodeURIComponent\(username\)\}/)
    expect(src).toMatch(/await me\(\)/)
    expect(src).toMatch(/isOnboardingFullyComplete/)
    expect(src).toMatch(/firstIncompleteOnboardingPage/)
  })

  it('keeps page 1 username-first and defers email, referral, and attribution', () => {
    const page1 = src.slice(src.indexOf('v-show="page === 1"'), src.indexOf('v-show="page === 2"'))
    const page3 = src.slice(src.indexOf('v-show="page === 3"'), src.indexOf('v-if="error"'))
    expect(page1).toMatch(/Username/)
    expect(page1).toMatch(/Add display name \(optional\)/)
    expect(page1).not.toMatch(/v-model="email"/)
    expect(page1).not.toMatch(/referralCodeInput/)
    expect(page1).not.toMatch(/heardAboutUs/)
    expect(page3).toMatch(/v-model="email"/)
    expect(page3).toMatch(/referralCodeInput/)
    expect(page3).toMatch(/heardAboutUs/)
    expect(page3).toMatch(/\(optional\)/)
    expect(src).not.toMatch(/How you heard about us is required/)
  })

  it('collapses extra arenas behind More and uses a black Continue that disables when invalid', () => {
    expect(src).toMatch(/PRIMARY_ARENA_KEYS/)
    expect(src).toMatch(/More arenas/)
    expect(src).toMatch(/:disabled="submitting \|\| !canContinue"/)
    expect(src).toMatch(/!bg-black/)
    expect(src).toMatch(/Must be 18\+ to join/)
    expect(src).toMatch(/MM \/ DD \/ YYYY/)
    expect(src).toMatch(/showEmailError/)
    expect(src).toMatch(/if \(referralError\.value\) throw/)
    expect(src).not.toMatch(/phone/i)
  })

  it('declares location preview state before the immediate user watch that fetches it', () => {
    const loadingDecl = src.indexOf('const locationPreviewLoading')
    const fetchDecl = src.indexOf('async function fetchLocationPreview')
    const userWatch = src.indexOf('void fetchLocationPreview(u.locationZip)')
    expect(loadingDecl).toBeGreaterThan(-1)
    expect(fetchDecl).toBeGreaterThan(-1)
    expect(userWatch).toBeGreaterThan(-1)
    expect(loadingDecl).toBeLessThan(userWatch)
    expect(fetchDecl).toBeLessThan(userWatch)
  })
})
