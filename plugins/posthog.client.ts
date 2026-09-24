import posthog, { type PostHog } from 'posthog-js'
import { sanitizeAnalyticsProperties } from '~/utils/analytics-privacy'
import type { AuthUser } from '~/composables/useAuth'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  const key = config.public.posthogKey as string
  const host = config.public.posthogHost as string

  // A real PostHog project key starts with "phc_" and is ~48 chars.
  // Reject empty values and obvious placeholders (e.g. phc_xxxx) so we never
  // fire real network requests when PostHog isn't set up yet.
  const isValidKey = key && key.startsWith('phc_') && key.length >= 20

  let client: PostHog | null = null
  let impersonating = false

  if (isValidKey) {
    posthog.init(key, {
      api_host: host || 'https://us.i.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      autocapture: false,
      // Private conversations never enter replay. Product funnels use explicit events.
      disable_session_recording: true,
      before_send: (event) => {
        if (!event || impersonating) return null
        event.properties = sanitizeAnalyticsProperties(event.properties)
        return event
      },
    })

    client = posthog
    posthog.register({ platform: 'www', environment: import.meta.dev ? 'development' : 'production' })
    let identifiedId: string | null = null

    // Track route changes as pageviews.
    const router = useRouter()
    let lastPath: string | null = null
    function capturePageview(path: string, name?: unknown) {
      if (path === lastPath) return
      lastPath = path
      posthog.capture('$pageview', { $current_url: window.location.origin + path, route_name: String(name ?? '') })
    }
    router.afterEach((to) => capturePageview(to.path, to.name))

    // Identify the user once auth state is loaded.
    nuxtApp.hooks.hookOnce('app:mounted', () => {
      const authUser = useState<AuthUser | null>('auth-user')

      function syncIdentity(user: AuthUser | null) {
        impersonating = Boolean(user?.impersonation)
        if (impersonating) return
        const previous = identifiedId ?? (posthog.get_property('$user_id') as string | undefined)
        if (previous && previous !== user?.id) {
          posthog.reset()
          posthog.register({ platform: 'www', environment: import.meta.dev ? 'development' : 'production' })
        }
        identifiedId = user?.id ?? null
        if (user) identifyUser(user)
      }
      syncIdentity(authUser.value)

      watch(authUser, (user) => {
        syncIdentity(user)
      })

      posthog.capture('app_opened')
      capturePageview(router.currentRoute.value.path, router.currentRoute.value.name)
    })
  } else if (key) {
    console.warn('[PostHog] Key looks like a placeholder — skipping init. Set NUXT_PUBLIC_POSTHOG_KEY to your real project key.')
  }

  function identifyUser(user: AuthUser) {
    posthog.identify(
      user.id,
      // Mutable properties — updated on every identify call.
      {
        $name: user.username ? `@${user.username}` : undefined,
        name: user.name ?? undefined,
        username: user.username ?? undefined,
        premium: user.premium ?? false,
        premium_plus: user.premiumPlus ?? false,
        verified_status: user.verifiedStatus ?? 'none',
        site_admin: user.siteAdmin ?? false,
        is_organization: user.isOrganization ?? false,
        coins: user.coins ?? 0,
        checkin_streak_days: user.checkinStreakDays ?? 0,
      },
      // $set_once — written on first identify, never overwritten.
      {
        first_seen_at: new Date().toISOString(),
        signed_up_at: user.createdAt ?? undefined,
      },
    )
  }

  return { provide: { posthog: client } }
})
