import {
  ANON_VIEW_COOKIE,
  generateAnonViewId,
  isValidAnonViewId,
} from '~/utils/anon-view-id'

/** Client-only fallback when cookies are blocked (in-app browsers, ITP). Never used on SSR. */
let clientMemoryAnonViewId: string | null = null

function readCookieId(cookie: { value: string | null }): string | null {
  const value = (cookie.value ?? '').trim()
  return isValidAnonViewId(value) ? value : null
}

function persistCookie(cookie: { value: string | null }, id: string) {
  try {
    cookie.value = id
  } catch {
    // Cookies blocked; in-memory id still lets this session count.
  }
}

function ensureClientAnonViewId(cookie: { value: string | null }): string {
  const fromCookie = readCookieId(cookie)
  if (fromCookie) {
    clientMemoryAnonViewId = fromCookie
    return fromCookie
  }
  if (clientMemoryAnonViewId && isValidAnonViewId(clientMemoryAnonViewId)) {
    persistCookie(cookie, clientMemoryAnonViewId)
    return clientMemoryAnonViewId
  }
  const next = generateAnonViewId()
  clientMemoryAnonViewId = next
  persistCookie(cookie, next)
  return next
}

export function useAnonViewId() {
  const cookie = useCookie<string | null>(ANON_VIEW_COOKIE, {
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    default: () => null,
  })

  if (import.meta.server && !readCookieId(cookie)) {
    cookie.value = generateAnonViewId()
  }
  if (import.meta.client) {
    ensureClientAnonViewId(cookie)
  }

  return computed(() => {
    if (import.meta.client) return ensureClientAnonViewId(cookie)
    return readCookieId(cookie)
  })
}
