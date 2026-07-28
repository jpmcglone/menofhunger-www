import type { DailyContentToday } from '~/types/api'

/**
 * Shared composable for the 'daily-content:today' async data key.
 * All callers must go through this composable so handler.toString() is
 * identical everywhere — preventing Nuxt's "Incompatible options" dev warning.
 * Callers may pass `server: false` or `immediate: false` without triggering
 * the warning because Nuxt only checks handler and default, not those flags.
 */
export function useDailyContentToday(
  opts: Omit<Parameters<typeof useAsyncData>[2], 'default'> = {},
) {
  const { apiFetchData } = useApiClient()
  return useAsyncData<DailyContentToday | null>(
    'daily-content:today',
    () => apiFetchData<DailyContentToday>('/meta/daily-content/today', { method: 'GET' }),
    { default: () => null, ...opts },
  )
}
