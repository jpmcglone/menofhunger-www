/**
 * Tracks push notification click-throughs. When the user opens the app via a
 * notification click, the service worker appends ?from=push&kind=...&tag=... to
 * the URL. We capture that as analytics and optionally clean the URL.
 */
export default defineNuxtPlugin((nuxtApp) => {
  if (import.meta.server) return

  nuxtApp.hooks.hookOnce('app:mounted', () => {
    const route = useRoute()
    const router = useRouter()
    const from = route.query.from as string | undefined
    const kind = route.query.kind as string | undefined
    const tag = route.query.tag as string | undefined

    if (from !== 'push' || !kind) return

    const posthog = useNuxtApp().$posthog as { capture?: (event: string, props?: Record<string, unknown>) => void } | null
    if (posthog?.capture) {
      posthog.capture('notification_clicked', {
        source: 'push',
        kind: kind || 'generic',
        tag: tag || '',
      })
    }

    // Clean URL so params don't persist on refresh/share.
    const cleanQuery = { ...route.query }
    delete cleanQuery.from
    delete cleanQuery.kind
    delete cleanQuery.tag
    router.replace({ path: route.path, query: cleanQuery }).catch(() => {})
  })
})
