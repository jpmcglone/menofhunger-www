import posthog, { type PostHog } from 'posthog-js'
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

  if (isValidKey) {
    posthog.init(key, {
      api_host: host || 'https://us.i.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      autocapture: false,
      // Session replay — masks all inputs by default for privacy.
      // Enable/disable in PostHog → Project Settings → Session Replay.
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-ph-mask]', // add data-ph-mask to any sensitive element
      },
    })

    client = posthog

    // Track route changes as pageviews.
    const router = useRouter()
    router.afterEach((to) => {
      posthog.capture('$pageview', { $current_url: window.location.origin + to.fullPath })
    })

    // Identify the user once auth state is loaded.
    nuxtApp.hooks.hookOnce('app:mounted', () => {
      const authUser = useState<AuthUser | null>('auth-user')

      if (authUser.value) identifyUser(authUser.value)

      watch(authUser, (user) => {
        if (user) identifyUser(user)
        else posthog.reset()
      })

      posthog.capture('app_opened')
    })
  } else if (key) {
    console.log('[PostHog] Key looks like a placeholder — skipping init. Set NUXT_PUBLIC_POSTHOG_KEY to your real project key.')
  }

  function identifyUser(user: AuthUser) {
    posthog.identify(
      user.id,
      // Mutable properties — updated on every identify call.
      {
        $name: user.username ? `@${user.username}` : undefined,
        name: user.name ?? undefined,
        email: user.email ?? undefined,
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
