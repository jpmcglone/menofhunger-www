import { siteConfig } from '~/config/site'
import { primaryTintCssForUser } from '~/utils/theme-tint'
import { useBookmarkCollections } from '~/composables/useBookmarkCollections'

/** Session-level side effects for the app shell: web push, bookmark folders, attention title, and theme tint. */
export function useAppLayoutSession() {
  const { user } = useAuth()
  const { isAuthed } = useAppNav()
  const attention = useAttentionTotals()
  const {
    loaded: bookmarksLoaded,
    loading: bookmarksLoading,
    ensureLoaded: ensureBookmarkCollectionsLoaded,
  } = useBookmarkCollections()


  // Rebind web push whenever the active identity changes (login or account switch).
  watch(
    () => user.value?.id ?? null,
    (id) => {
      if (!id || !import.meta.client) return
      const push = usePushNotifications()
      void push.ensureSubscribedWhenGranted()
    },
    { immediate: true },
  )

  function canLoadBookmarkCollections() {
    if (!isAuthed.value) return false
    const status = user.value?.verifiedStatus
    return status === 'identity' || status === 'manual'
  }

  function maybeRetryBookmarkCollections() {
    if (!import.meta.client) return
    if (!canLoadBookmarkCollections()) return
    // If we haven't loaded yet (or last attempt errored), retry.
    if (!bookmarksLoaded.value && !bookmarksLoading.value) {
      void ensureBookmarkCollectionsLoaded({ force: true })
    }
  }

  watch(
    () => [isAuthed.value, user.value?.verifiedStatus] as const,
    () => {
      if (!import.meta.client) return
      if (!canLoadBookmarkCollections()) return
      // Force once when the user can access folders (verified). Avoids 403s during onboarding.
      void ensureBookmarkCollectionsLoaded({ force: true })
    },
    { immediate: true },
  )

  onMounted(() => {
    window.addEventListener('focus', maybeRetryBookmarkCollections)
    document.addEventListener('visibilitychange', maybeRetryBookmarkCollections)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('focus', maybeRetryBookmarkCollections)
    document.removeEventListener('visibilitychange', maybeRetryBookmarkCollections)
  })

  if (import.meta.client) {
    watchEffect(() => {
      // Counted activity shows its number; countless activity (a dot) shows (*). Both clear together.
      const prefix = attention.totalCount.value > 0 ? `(${attention.totalLabel.value}) ` : attention.hasAnyDot.value ? '(*) ' : ''
      useHead({
        titleTemplate: (title) => `${prefix}${title || siteConfig.meta.title}`,
      })
    })
  }

  // Dynamic theme tint: default (orange) for logged out/unverified, verified = blue, premium = orange.
  // We override PrimeVue semantic primary tokens via CSS variables so the entire UI tint follows status.
  const primaryCssVars = computed(() => primaryTintCssForUser(user.value ?? null))
  useHead({
    style: [{ key: 'moh-primary-tint', textContent: primaryCssVars }],
  })

}
