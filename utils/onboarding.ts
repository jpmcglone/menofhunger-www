import type { HeardAboutUs } from '~/types/api'

export type OnboardingState = {
  usernameIsSet?: boolean
  birthdate?: string | null
  interests?: unknown
  menOnlyConfirmed?: boolean
  heardAboutUs?: HeardAboutUs | null
}

export type OnboardingPage = 1 | 2

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
  if (page === 1) return Boolean(user.usernameIsSet && user.birthdate && user.menOnlyConfirmed)
  return Array.isArray(user.interests) && user.interests.length >= 1
}

export function isOnboardingFullyComplete(user: OnboardingState | null | undefined): boolean {
  return isOnboardingPageComplete(1, user) && isOnboardingPageComplete(2, user)
}

export function firstIncompleteOnboardingPage(user: OnboardingState | null | undefined): OnboardingPage {
  return isOnboardingPageComplete(1, user) ? 2 : 1
}

export function nextIncompleteOnboardingPage(from: OnboardingPage, user: OnboardingState | null | undefined): OnboardingPage | null {
  return from === 1 && !isOnboardingPageComplete(2, user) ? 2 : null
}

export function isBirthdate18Plus(value: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false
  const cutoff = new Date(Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()))
  return date <= cutoff
}
