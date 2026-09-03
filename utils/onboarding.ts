import type { HeardAboutUs } from '~/types/api'

export type OnboardingState = {
  usernameIsSet?: boolean
  birthdate?: string | null
  interests?: unknown
  menOnlyConfirmed?: boolean
  heardAboutUs?: HeardAboutUs | null
}

export type OnboardingPage = 1 | 2 | 3

export const HEARD_ABOUT_US_OPTIONS: { value: HeardAboutUs; label: string }[] = [
  { value: 'friend', label: 'A friend' },
  { value: 'google', label: 'Google' },
  { value: 'x', label: 'X' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'nxr', label: 'NXR conference' },
  { value: 'church', label: 'Church or group' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'prefer_not', label: 'Prefer not to say' },
  { value: 'other', label: 'Other' },
]

export function needsOnboarding(user: OnboardingState | null | undefined): boolean {
  if (!user) return true
  return !user.usernameIsSet
    || !user.birthdate
    || !Array.isArray(user.interests)
    || user.interests.length < 1
    || !user.menOnlyConfirmed
}

export function isOnboardingPageComplete(page: OnboardingPage, user: OnboardingState | null | undefined): boolean {
  if (!user) return false
  if (page === 1) return Boolean(user.usernameIsSet)
  if (page === 2) return Array.isArray(user.interests) && user.interests.length >= 1
  return Boolean(user.birthdate && user.menOnlyConfirmed)
}

export function isOnboardingFullyComplete(user: OnboardingState | null | undefined): boolean {
  return isOnboardingPageComplete(1, user)
    && isOnboardingPageComplete(2, user)
    && isOnboardingPageComplete(3, user)
}

export function firstIncompleteOnboardingPage(user: OnboardingState | null | undefined): OnboardingPage {
  if (!isOnboardingPageComplete(1, user)) return 1
  if (!isOnboardingPageComplete(2, user)) return 2
  return 3
}

export function nextIncompleteOnboardingPage(
  from: OnboardingPage,
  user: OnboardingState | null | undefined,
): OnboardingPage | null {
  for (const page of [1, 2, 3] as const) {
    if (page <= from) continue
    if (!isOnboardingPageComplete(page, user)) return page
  }
  return null
}
