import type { ApiEnvelope } from '~/types/api'
import { joinUrl } from '~/utils/url'

type ApiFetchOptions = Parameters<typeof $fetch>[1]

type MohCacheOptions =
  | false
  | {
      /** Cache duration (ms). Client-only. */
      ttlMs: number
      /** Optional override key (defaults to method+url). */
      key?: string
    }

type MohApiFetchOptions = ApiFetchOptions & {
  /** Optional MenOfHunger response cache (client-only). */
  mohCache?: MohCacheOptions
  /** Deduplicate identical in-flight GETs (default true). */
  mohDedupe?: boolean
}

const inflight = new Map<string, Promise<unknown>>()
const responseCache = new Map<string, { expiresAt: number; value: unknown }>()

function mergeHeaders(a?: HeadersInit, b?: HeadersInit): HeadersInit | undefined {
  if (!a && !b) return undefined
  if (!a) return b
  if (!b) return a

  // Normalize into a plain object (works for common cases used in this codebase).
  const out: Record<string, string> = {}

  const assign = (h: HeadersInit) => {
    if (Array.isArray(h)) {
      for (const [k, v] of h) out[k] = v
      return
    }
    if (h instanceof Headers) {
      h.forEach((v, k) => {
        out[k] = v
      })
      return
    }
    Object.assign(out, h)
  }

  assign(a)
  assign(b)
  return out
}

export function useApiClient() {
  const config = useRuntimeConfig()
  // IMPORTANT: On the client, only `public` + `app` runtime config keys are accessible.
  // Accessing server-only keys on the client triggers a Nuxt warning.
  const serverApiBaseUrl = import.meta.server ? String(config.apiBaseUrl || '').trim() : ''
  const publicApiBaseUrl = String(config.public.apiBaseUrl || '').trim()

  // On SSR, prefer server-only base URL (container/VM friendly).
  // In browser, prefer public base URL.
  const apiBaseUrl = (import.meta.server ? serverApiBaseUrl : publicApiBaseUrl) || publicApiBaseUrl || serverApiBaseUrl

  function apiUrl(path: string) {
    if (!apiBaseUrl) {
      throw new Error(
        'API base URL is not set (runtimeConfig.apiBaseUrl or runtimeConfig.public.apiBaseUrl)'
      )
    }
    return joinUrl(apiBaseUrl, path)
  }

  /** Default timeout (ms) so a slow or stuck API does not hang SSR. Override via options.timeout. */
  const defaultTimeoutMs = 15_000

  async function apiFetch<T>(path: string, options: MohApiFetchOptions = {}): Promise<ApiEnvelope<T>> {
    const url = apiUrl(path)

    let ssrHeaders: HeadersInit | undefined
    if (import.meta.server) {
      ssrHeaders = useRequestHeaders(['cookie'])
      const event = useRequestEvent()
      const requestId = (event?.context as { requestId?: string } | undefined)?.requestId
      if (requestId) {
        ssrHeaders = mergeHeaders(ssrHeaders, { 'x-request-id': requestId })
      }
    }
    const headers = mergeHeaders(ssrHeaders, options.headers)

    const { mohCache, mohDedupe, ...fetchOptions } = options
    const timeout = fetchOptions.timeout ?? defaultTimeoutMs

    const method = String(fetchOptions.method || 'GET').toUpperCase()
    const dedupe = mohDedupe !== false
    const cacheOpt = mohCache ?? false

    // Only support caching/dedupe for GET requests.
    if (method === 'GET') {
      const cookieForKey = import.meta.server ? String((ssrHeaders as Record<string, string> | undefined)?.cookie ?? '') : ''
      const baseKey = `${method}:${url}`
      const inflightKey = import.meta.server ? `${baseKey}:cookie=${cookieForKey}` : baseKey

      // Client-only response cache (never cache across server requests).
      if (import.meta.client && cacheOpt && typeof cacheOpt === 'object' && cacheOpt.ttlMs > 0) {
        const now = Date.now()
        const cacheKey = cacheOpt.key ?? baseKey
        const hit = responseCache.get(cacheKey)
        if (hit && hit.expiresAt > now) return hit.value as ApiEnvelope<T>
        if (hit) responseCache.delete(cacheKey)
      }

      if (dedupe) {
        const existing = inflight.get(inflightKey)
        if (existing) return (await existing) as ApiEnvelope<T>
      }

      const p = $fetch<ApiEnvelope<T>>(url, {
        ...fetchOptions,
        credentials: fetchOptions.credentials ?? 'include',
        headers,
        timeout,
      })
        .then((env) => {
          if (import.meta.client && cacheOpt && typeof cacheOpt === 'object' && cacheOpt.ttlMs > 0) {
            const baseKey2 = `${method}:${url}`
            const cacheKey = cacheOpt.key ?? baseKey2
            responseCache.set(cacheKey, { value: env, expiresAt: Date.now() + cacheOpt.ttlMs })
          }
          return env
        })
        .finally(() => {
          inflight.delete(inflightKey)
        })

      inflight.set(inflightKey, p as Promise<unknown>)
      return await p
    }

    return await $fetch<ApiEnvelope<T>>(url, {
      ...fetchOptions,
      credentials: fetchOptions.credentials ?? 'include',
      headers,
      timeout
    })
  }

  async function apiFetchData<T>(path: string, options: MohApiFetchOptions = {}): Promise<T> {
    const result = await apiFetch<T>(path, options)
    return result.data
  }

  return { apiBaseUrl, apiUrl, apiFetch, apiFetchData }
}

