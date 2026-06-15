export default defineNuxtRouteMiddleware(async () => {
  const { user, ensureLoaded, isVerified, isPremium } = useAuth()
  await ensureLoaded()

  // Let auth middleware handle anonymous users.
  if (!user.value?.id) return

  // Verified+ (or Premium / Premium+) only — mirrors the API VerifiedGuard
  // (premium || premiumPlus) and the nav's `requiresVerified` predicate.
  if (!isVerified.value && !isPremium.value) {
    return navigateTo('/settings/verification')
  }
})

