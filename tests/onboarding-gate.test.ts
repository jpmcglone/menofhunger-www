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
  heardAboutUs: 'friend',
}

describe('needsOnboarding', () => {
  it('allows a user only after all required profile fields are complete', () => {
    expect(needsOnboarding(completeUser)).toBe(false)
  })

  it('does not re-gate a legacy member who never set how they heard', () => {
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
  it('treats page 1 as incomplete until username and how-you-heard are set', () => {
    expect(isOnboardingPageComplete(1, { usernameIsSet: true })).toBe(false)
    expect(isOnboardingPageComplete(1, { usernameIsSet: true, heardAboutUs: 'google' })).toBe(true)
  })

  it('lands on the first incomplete page', () => {
    expect(firstIncompleteOnboardingPage({
      usernameIsSet: false,
      interests: ['strength_training'],
      menOnlyConfirmed: false,
    })).toBe(1)

    expect(firstIncompleteOnboardingPage({
      usernameIsSet: true,
      heardAboutUs: 'friend',
      interests: [],
      birthdate: null,
      menOnlyConfirmed: false,
    })).toBe(2)

    expect(firstIncompleteOnboardingPage({
      usernameIsSet: true,
      heardAboutUs: 'friend',
      interests: ['strength_training'],
      birthdate: null,
      menOnlyConfirmed: false,
    })).toBe(3)
  })

  it('skips a completed interests page when moving forward', () => {
    const user: OnboardingState = {
      usernameIsSet: true,
      heardAboutUs: 'nxr',
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
      heardAboutUs: 'friend',
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
    expect(src).toMatch(/pending-edit-profile/)
    expect(src).toMatch(/\/u\/\$\{encodeURIComponent\(username\)\}/)
    expect(src).toMatch(/await me\(\)/)
    expect(src).toMatch(/isOnboardingFullyComplete/)
    expect(src).toMatch(/firstIncompleteOnboardingPage/)
  })

  it('collects optional display name and shows required errors after submit', () => {
    expect(src).toMatch(/Display name/)
    expect(src).toMatch(/attempted/)
    expect(src).toMatch(/showUsernameError/)
    expect(src).toMatch(/showEmailError/)
    expect(src).toMatch(/:disabled="submitting"/)
    expect(src).toMatch(/clearNuxtData/)
    expect(src).not.toMatch(/phone/i)
  })

  it('refreshes the signed-in user before opening edit profile after onboarding', () => {
    const profilePage = readFileSync(resolve(process.cwd(), 'pages/u/[username].vue'), 'utf8')
    const refetchAt = profilePage.indexOf('if (isSelf.value) await refetchMe()')
    const refreshAt = profilePage.indexOf('await refreshNuxtData(`public-profile:${normalizedUsername.value}`)')
    const openAt = profilePage.indexOf('editOpen.value = true')
    expect(refetchAt).toBeGreaterThan(-1)
    expect(refreshAt).toBeGreaterThan(-1)
    expect(openAt).toBeGreaterThan(-1)
    expect(refetchAt).toBeLessThan(openAt)
    expect(refreshAt).toBeLessThan(openAt)
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
