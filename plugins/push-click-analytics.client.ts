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
    const asUserId = typeof route.query.as === 'string' ? route.query.as.trim() : ''

    if (from !== 'push' || !kind) return

    const posthog = useNuxtApp().$posthog as { capture?: (event: string, props?: Record<string, unknown>) => void } | null
    if (posthog?.capture) {
      posthog.capture('notification_clicked', {
        source: 'push',
        kind: kind || 'generic',
        tag: tag || '',
      })
    }

    const cleanQuery = { ...route.query }
    delete cleanQuery.from
    delete cleanQuery.kind
    delete cleanQuery.tag
    delete cleanQuery.as
    const then = router.resolve({ path: route.path, query: cleanQuery }).fullPath

    const { user } = useAuth()
    const { accounts, refresh, switchTo } = useAccountSwitcher()
    const currentId = user.value?.id ?? null
    if (asUserId && asUserId !== currentId) {
      void (async () => {
        if (!accounts.value.length) await refresh()
        const target = accounts.value.find((account) => account.id === asUserId)
        if (target && !target.isCurrent) {
          await switchTo(asUserId, { then })
          return
        }
        router.replace({ path: route.path, query: cleanQuery }).catch(() => {})
      })()
      return
    }

    router.replace({ path: route.path, query: cleanQuery }).catch(() => {})
  })
})
