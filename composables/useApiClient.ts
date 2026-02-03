import type { ApiEnvelope } from '~/types/api'

type ApiFetchOptions = Parameters<typeof $fetch>[1]

function joinUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/+$/, '')
  const p = path.replace(/^\/+/, '')
  return `${base}/${p}`
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

  async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<ApiEnvelope<T>> {
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

    const timeout = options.timeout ?? defaultTimeoutMs

    return await $fetch<ApiEnvelope<T>>(url, {
      ...options,
      credentials: options.credentials ?? 'include',
      headers,
      timeout
    })
  }

  async function apiFetchData<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const result = await apiFetch<T>(path, options)
    return result.data
  }

  return { apiBaseUrl, apiUrl, apiFetch, apiFetchData }
}

