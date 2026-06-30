/**
 * "Get the app" link — gated entirely behind NUXT_PUBLIC_IOS_APP_URL.
 * Until that env var is set (App Store URL once live, or a TestFlight link in the
 * meantime), `isConfigured` is false and every call site hides the link. This keeps
 * the UI honest: we never show a CTA that points nowhere.
 */
export function useIosAppLink() {
  const config = useRuntimeConfig()
  const url = (config.public.iosAppUrl as string) || ''
  const isConfigured = Boolean(url)

  function trackClick(location: 'footer' | 'settings') {
    useNuxtApp().$posthog?.capture('app_store_link_clicked', { location })
  }

  return { url, isConfigured, trackClick }
}
