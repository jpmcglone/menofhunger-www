import * as Sentry from '@sentry/nuxt'

/**
 * Keep Sentry's user context in sync with the logged-in user.
 * This enables filtering errors by user, searching by username/email,
 * and seeing user context on every event automatically.
 */
export default defineNuxtPlugin(() => {
  const { user } = useAuth()

  watch(
    user,
    (u) => {
      if (!u) {
        Sentry.setUser(null)
        return
      }

      const tier = u.siteAdmin
        ? 'admin'
        : u.premiumPlus
          ? 'premium_plus'
          : u.premium
            ? 'premium'
            : (u.verifiedStatus ?? 'none') !== 'none'
              ? 'verified'
              : 'unverified'

      Sentry.setUser({
        id: u.id,
        username: u.username ?? undefined,
        email: u.email ?? undefined,
        // `segment` shows up as a filterable field in Sentry's issue list
        segment: tier,
      })

      // Tags let you filter issues by these dimensions in the Sentry UI
      Sentry.setTag('user.tier', tier)
      Sentry.setTag('user.verified_status', u.verifiedStatus ?? 'none')
      Sentry.setTag('user.is_admin', String(!!u.siteAdmin))
    },
    { immediate: true },
  )
})
