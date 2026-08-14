/**
 * Thin PostHog capture helper. No-ops when the client plugin is not configured.
 */
export function usePostHog() {
  const nuxtApp = useNuxtApp()

  function capture(event: string, properties?: Record<string, unknown>) {
    nuxtApp.$posthog?.capture(event, properties)
  }

  return { capture }
}
