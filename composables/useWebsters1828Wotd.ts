import type { Websters1828WordOfDay } from '~/types/api'

/**
 * App-lifetime WOTD state backed by useState.
 *
 * Unlike the internal data ref inside useAsyncData, useState is NEVER cleared
 * when a page component unmounts. Exporting this lets socket handlers (and
 * the like-button) patch the persistent copy directly so it stays in sync.
 */
export const useWotdData = () =>
  useState<Websters1828WordOfDay | null>('wotd:data', () => null)

/** Shared request state; the persistent copy avoids blanking during navigation. */
export function useWebsters1828Wotd(
  opts: Omit<Parameters<typeof useAsyncData>[2], 'default'> = {},
) {
  const { apiFetchData } = useApiClient()
  const wotdData = useWotdData()
  const requestVersion = useState<number>('wotd:request-version', () => 0)

  return useAsyncData<Websters1828WordOfDay | null>(
    'websters1828:wotd',
    async () => {
      const version = ++requestVersion.value
      const data = await apiFetchData<Websters1828WordOfDay>(
        '/meta/websters1828/wotd?includeDefinition=1',
        { method: 'GET', cache: 'no-store', mohDedupe: false },
      )
      if (version === requestVersion.value) wotdData.value = data ?? null
      return data
    },
    {
      // After asyncData.clear() the ref reverts to this; returning the persistent
      // value means the UI never blanks out during navigation.
      default: () => wotdData.value,
      // Re-entering from a notification must not reuse an app-lifetime word snapshot.
      // Refresh requests also bypass HTTP caching and pre-publication in-flight GETs.
      getCachedData: (key, nuxtApp) =>
        nuxtApp.isHydrating ? nuxtApp.payload.data[key] : undefined,
      ...opts,
    },
  )
}
