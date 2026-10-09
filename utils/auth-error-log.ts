import { getErrorReason, getErrorStatus } from './api-error'

/** Keep dev logger payloads serializable and free of request/cookie objects. */
export function getSafeAuthErrorDetails(e: unknown): Record<string, string | number | null> {
  const error = e && typeof e === 'object' ? e as Record<string, unknown> : {}
  const cause = error.cause && typeof error.cause === 'object'
    ? error.cause as Record<string, unknown>
    : {}
  const rawName = error.name
  const name = typeof rawName === 'string' && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(rawName)
    ? rawName
    : 'Error'
  const rawCode = typeof error.code === 'string' ? error.code : cause.code
  const code = typeof rawCode === 'string' && /^[A-Z0-9_]{1,40}$/.test(rawCode) ? rawCode : null
  const rawMessage = typeof error.message === 'string' ? error.message.trim() : ''
  const message = /^(fetch failed|failed to fetch|network request failed|load failed|network error)$/i.test(rawMessage)
    ? rawMessage
    : 'Request failed'

  return {
    name,
    message,
    status: getErrorStatus(e),
    reason: getErrorReason(e),
    code,
  }
}

