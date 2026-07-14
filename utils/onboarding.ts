export type OnboardingState = {
  usernameIsSet?: boolean
  birthdate?: string | null
  interests?: unknown
  menOnlyConfirmed?: boolean
}

export function needsOnboarding(user: OnboardingState | null | undefined): boolean {
  if (!user) return true
  return !user.usernameIsSet
    || !user.birthdate
    || !Array.isArray(user.interests)
    || user.interests.length < 1
    || !user.menOnlyConfirmed
}
