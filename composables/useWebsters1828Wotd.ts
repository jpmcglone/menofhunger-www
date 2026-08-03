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

/**
 * Shared composable for the 'websters1828:wotd' async data key.
 *
 * Why useState instead of relying solely on useAsyncData?
 * Nuxt calls asyncData.clear() when the page component that owns the key
 * unmounts (e.g. when leaving /daily/word). That resets the shared data ref to
 * null, causes the right-rail card to show a loading skeleton, and triggers a
 * re-fetch that hits the browser's HTTP cache — which may have a stale likeCount.
 *
 * By backing the data with a useState:
 *  - `default: () => wotdData.value` — after clear(), the ref is instantly
 *    restored to the last known value, no skeleton flash.
 *  - `getCachedData` — on the client, skips the HTTP fetch entirely whenever
 *    the persistent cache already has data. The socket keeps it accurate.
 */
export function useWebsters1828Wotd(
  opts: Omit<Parameters<typeof useAsyncData>[2], 'default'> = {},
) {
  const { apiFetchData } = useApiClient()
  const wotdData = useWotdData()

  return useAsyncData<Websters1828WordOfDay | null>(
    'websters1828:wotd',
    async () => {
      const data = await apiFetchData<Websters1828WordOfDay>(
        '/meta/websters1828/wotd?includeDefinition=1',
        { method: 'GET' },
      )
      wotdData.value = data ?? null
      return data
    },
    {
      // After asyncData.clear() the ref reverts to this; returning the persistent
      // value means the UI never blanks out during navigation.
      default: () => wotdData.value,
      // Client-side: skip the HTTP fetch when we already have data in memory.
      // This is the key guard against stale browser-HTTP-cache responses
      // (the API sets Cache-Control which lets browsers cache old likeCount values).
      getCachedData: (_key, nuxtApp, ctx) => {
        // Let refresh() and hook-driven refreshes always re-fetch so publish-boundary
        // rollovers and realtime events actually see the latest word.
        if (ctx.cause === 'refresh:manual' || ctx.cause === 'refresh:hook') return undefined
        if (import.meta.client && wotdData.value !== null) return wotdData.value
        // SSR / first hydration: fall back to the Nuxt payload.
        return nuxtApp.payload.data[_key] ?? nuxtApp.static.data[_key]
      },
      ...opts,
    },
  )
}
