import posthog from 'posthog-js'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()

  const key = config.public.posthogKey as string
  const host = config.public.posthogHost as string

  // A real PostHog project key starts with "phc_" and is ~48 chars.
  // Reject empty values and obvious placeholders (e.g. phc_xxxx) so we never
  // fire real network requests when PostHog isn't set up yet.
  const isValidKey = key && key.startsWith('phc_') && key.length >= 20
  if (!isValidKey) {
    if (key) {
      console.log('[PostHog] Key looks like a placeholder — skipping init. Set NUXT_PUBLIC_POSTHOG_KEY to your real project key.')
    }
    return { provide: { posthog: null } }
  }

  posthog.init(key, {
    api_host: host || 'https://us.i.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    autocapture: false,
  })

  // Track route changes as pageviews.
  const router = useRouter()
  router.afterEach((to) => {
    posthog.capture('$pageview', { $current_url: window.location.origin + to.fullPath })
  })

  // Identify the user once auth state is loaded.
  nuxtApp.hooks.hookOnce('app:mounted', () => {
    // Watch the auth-user state key for the first non-null value.
    const authUser = useState<{ id: string; name?: string | null; email?: string | null; premium?: boolean; premiumPlus?: boolean; username?: string | null } | null>('auth-user')

    if (authUser.value) {
      identifyUser(authUser.value)
    }

    watch(authUser, (user) => {
      if (user) {
        identifyUser(user)
      } else {
        posthog.reset()
      }
    })
  })

  function identifyUser(user: { id: string; name?: string | null; email?: string | null; premium?: boolean; premiumPlus?: boolean; username?: string | null }) {
    posthog.identify(user.id, {
      name: user.name ?? undefined,
      email: user.email ?? undefined,
      username: user.username ?? undefined,
      premium: user.premium ?? false,
      premium_plus: user.premiumPlus ?? false,
    })
  }

  return { provide: { posthog } }
})
