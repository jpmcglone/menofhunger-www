import type { ApiEnvelope } from '~/types/api'
import { clearAuthClientState } from '~/composables/auth/authState'
import { joinUrl } from '~/utils/url'
import { isAdminPath, isLoggedOutAllowedPath, isPostPermalinkPath, isPublicPath, isUserProfilePath } from '~/config/routes'

type ApiFetchOptions = NonNullable<Parameters<typeof $fetch>[1]>

export type MohApiQuery = Record<string, string | number | boolean | null | undefined>

type MohCacheOptions =
  | false
  | {
      /** Cache duration (ms). Client-only. */
      ttlMs: number
      /**
       * Optional stale-while-revalidate window (ms). Client-only.
       * When a cached value is stale but within this window, return it immediately
       * and refresh in the background.
       */
      staleWhileRevalidateMs?: number
      /** Optional override key (defaults to method+url). */
      key?: string
    }

export type MohApiFetchOptions = Omit<ApiFetchOptions, 'query'> & {
  /** Querystring params (typed to avoid `as any` at callsites). */
  query?: MohApiQuery
  /** Optional MenOfHunger response cache (client-only). */
  mohCache?: MohCacheOptions
  /** Deduplicate identical in-flight GETs (default true). */
  mohDedupe?: boolean
}

const inflight = new Map<string, Promise<unknown>>()
const responseCache = new Map<string, { expiresAt: number; staleUntil?: number; value: unknown }>()

function stableQueryKey(query: unknown): string {
  const q = query as Record<string, unknown> | null | undefined
  if (!q) return ''
  const keys = Object.keys(q).sort()
  const parts: string[] = []
  for (const k of keys) {
    const v = q[k]
    if (v === undefined || v === null) continue
    const s = typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(v)
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(s)}`)
  }
  return parts.length ? `?${parts.join('&')}` : ''
}

/**
 * Invalidate MenOfHunger client response cache entries.
 * Client-only. Safe to call on server (no-op).
 */
export function invalidateMohCache(params: { prefix?: string; exact?: string }) {
  if (!import.meta.client) return
  const exact = (params.exact ?? '').trim()
  const prefix = (params.prefix ?? '').trim()
  if (!exact && !prefix) return

  for (const k of responseCache.keys()) {
    if (exact && k === exact) responseCache.delete(k)
    else if (prefix && k.startsWith(prefix)) responseCache.delete(k)
  }
}

/** Clear all MenOfHunger client response/inflight caches. */
export function clearMohCacheAll() {
  if (!import.meta.client) return
  responseCache.clear()
  inflight.clear()
}

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

  function getErrorStatus(e: unknown): number | null {
    const anyErr = e as any
    const status =
      (typeof anyErr?.status === 'number' ? anyErr.status : null) ??
      (typeof anyErr?.statusCode === 'number' ? anyErr.statusCode : null) ??
      (typeof anyErr?.response?.status === 'number' ? anyErr.response.status : null) ??
      (typeof anyErr?.data?.meta?.status === 'number' ? anyErr.data.meta.status : null)
    return typeof status === 'number' ? status : null
  }

  function shouldRedirectToLogin(path: string, layout: unknown): boolean {
    if (path === '/login') return false
    // Match the global auth middleware’s protection rules.
    if (isPublicPath(path)) return false
    if (isUserProfilePath(path)) return false
    if (isPostPermalinkPath(path)) return false
    if (isAdminPath(path)) return false
    if (isLoggedOutAllowedPath(path)) return false
    return layout === 'app'
  }

  function handleUnauthorizedClientSide() {
    clearMohCacheAll()
    clearAuthClientState({ resetViewerCaches: true })
    if (!import.meta.client) return
    const route = useRoute()
    const path = String(route.path || '')
    const layout = route.meta?.layout
    if (!shouldRedirectToLogin(path, layout)) return
    const redirect = encodeURIComponent(route.fullPath || path)
    // `navigateTo` can return non-Promise values in some Nuxt contexts; normalize.
    void Promise.resolve(navigateTo(`/login?redirect=${redirect}`)).catch(() => undefined)
  }

  async function runFetch<T>(url: string, fetchOptions: ApiFetchOptions): Promise<ApiEnvelope<T>> {
    try {
      return await $fetch<ApiEnvelope<T>>(url, fetchOptions)
    } catch (e) {
      if (getErrorStatus(e) === 401) {
        handleUnauthorizedClientSide()
      }
      throw e
    }
  }

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
    const queryKey = stableQueryKey((fetchOptions as any)?.query)

    // Only support caching/dedupe for GET requests.
    if (method === 'GET') {
      const cookieForKey = import.meta.server ? String((ssrHeaders as Record<string, string> | undefined)?.cookie ?? '') : ''
      const baseKey = `${method}:${url}${queryKey}`
      const inflightKey = import.meta.server ? `${baseKey}:cookie=${cookieForKey}` : baseKey

      // Client-only response cache (never cache across server requests).
      if (import.meta.client && cacheOpt && typeof cacheOpt === 'object' && cacheOpt.ttlMs > 0) {
        const now = Date.now()
        const cacheKey = cacheOpt.key ?? baseKey
        const hit = responseCache.get(cacheKey)
        if (hit && hit.expiresAt > now) return hit.value as ApiEnvelope<T>

        const swrMs = Math.max(0, Math.floor(cacheOpt.staleWhileRevalidateMs ?? 0))
        if (hit && swrMs > 0) {
          const staleUntil = hit.staleUntil ?? hit.expiresAt + swrMs
          if (staleUntil > now) {
            // Return stale immediately, and refresh in background.
            const refreshKey = `${inflightKey}:swr:${cacheKey}`
            if (!inflight.get(refreshKey)) {
              const refresh = runFetch<T>(url, {
                ...fetchOptions,
                credentials: fetchOptions.credentials ?? 'include',
                headers,
                timeout,
              })
                .then((env) => {
                  responseCache.set(cacheKey, {
                    value: env,
                    expiresAt: Date.now() + cacheOpt.ttlMs,
                    staleUntil: Date.now() + cacheOpt.ttlMs + swrMs,
                  })
                  return env
                })
                .catch((e) => {
                  // Best-effort: keep serving stale data. On 401, the fetch wrapper
                  // already cleared auth state + redirected when appropriate.
                  const status = getErrorStatus(e)
                  if (import.meta.dev && status !== 401) {
                    // Avoid noisy production logging; dev-only visibility.
                    console.warn('[moh] SWR refresh failed', { url, status })
                  }
                  return undefined
                })
                .finally(() => {
                  inflight.delete(refreshKey)
                })

              inflight.set(refreshKey, refresh as Promise<unknown>)
            }

            return hit.value as ApiEnvelope<T>
          }
        }

        if (hit) responseCache.delete(cacheKey)
      }

      if (dedupe) {
        const existing = inflight.get(inflightKey)
        if (existing) return (await existing) as ApiEnvelope<T>
      }

      const p = runFetch<T>(url, {
        ...fetchOptions,
        credentials: fetchOptions.credentials ?? 'include',
        headers,
        timeout,
      })
        .then((env) => {
          if (import.meta.client && cacheOpt && typeof cacheOpt === 'object' && cacheOpt.ttlMs > 0) {
            const baseKey2 = `${method}:${url}${queryKey}`
            const cacheKey = cacheOpt.key ?? baseKey2
            const swrMs = Math.max(0, Math.floor(cacheOpt.staleWhileRevalidateMs ?? 0))
            responseCache.set(cacheKey, {
              value: env,
              expiresAt: Date.now() + cacheOpt.ttlMs,
              staleUntil: swrMs > 0 ? Date.now() + cacheOpt.ttlMs + swrMs : undefined,
            })
          }
          return env
        })
        .finally(() => {
          inflight.delete(inflightKey)
        })

      inflight.set(inflightKey, p as Promise<unknown>)
      return await p
    }

    return await runFetch<T>(url, {
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

