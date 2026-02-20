export default defineNuxtRouteMiddleware(async (to) => {
  const { user, ensureLoaded } = useAuth()
  await ensureLoaded()

  // Let auth middleware handle anonymous users.
  if (!user.value?.id) return

  // Verified+ (or Premium) only.
  const isVerified = Boolean(user.value?.premium) || (user.value?.verifiedStatus ?? 'none') !== 'none'
  if (!isVerified) {
    // Keep it simple: tiers explains Verified/Premium access.
    return navigateTo('/tiers')
  }
})

