/**
 * Public API docs (/api).
 *
 * Only the two zero-auth, wildcard-CORS endpoints from
 * `menofhunger-api/src/modules/public/public.controller.ts` are documented here.
 * Everything else requires a session cookie and belongs in a future private-API section.
 */

/**
 * Canonical production API base. Used by the guardrail test to verify no page
 * hardcodes this URL — all display-facing URLs must come from `useApiClient().apiBaseUrl`
 * so the docs reflect the environment they're running in.
 */
export const PUBLIC_API_BASE = 'https://api.menofhunger.com/v1'

export type ApiDocsNavItem = { to: string; label: string }

/** One row in an `<ApiDocsFields>` list. */
export type ApiDocsField = { name: string; type: string; note?: string }

export const API_DOCS_NAV: ApiDocsNavItem[] = [
  { to: '/api', label: 'Start' },
  { to: '/api/posts', label: 'Posts' },
  { to: '/api/profiles', label: 'Profiles' },
  { to: '/api/errors', label: 'Errors & limits' },
]

/**
 * Returns the public API base URL for display in the docs.
 *
 * Always reads `runtimeConfig.public.apiBaseUrl` (the browser-facing key) so:
 *  - SSR and client render the same string → no hydration mismatch.
 *  - The displayed URL matches what the browser actually sends requests to.
 *
 * Call inside `<script setup>` or a composable — NOT at module level.
 */
export function useApiDocsUrl() {
  const config = useRuntimeConfig()
  // Must be the *public* key so SSR and browser see the same value.
  const apiBaseUrl = computed(() => String(config.public.apiBaseUrl || '').trim())
  return {
    apiBaseUrl,
    url: (path: string) => `${apiBaseUrl.value}${path}`,
  }
}
