import type { Websters1828WordOfDay } from '~/types/api'

/**
 * Shared composable for the 'websters1828:wotd' async data key.
 * All callers must go through this composable so handler.toString() is
 * identical everywhere — preventing Nuxt's "Incompatible options" dev warning.
 * Callers may pass `server: false` or `lazy: true` without triggering the
 * warning because Nuxt only checks handler and default, not those flags.
 */
export function useWebsters1828Wotd(
  opts: Omit<Parameters<typeof useAsyncData>[2], 'default'> = {},
) {
  const { apiFetchData } = useApiClient()
  return useAsyncData<Websters1828WordOfDay | null>(
    'websters1828:wotd',
    () => apiFetchData<Websters1828WordOfDay>('/meta/websters1828/wotd?includeDefinition=1', { method: 'GET' }),
    { default: () => null, ...opts },
  )
}
