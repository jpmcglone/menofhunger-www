/**
 * Sentry PII scrubber.
 *
 * We opt into `sendDefaultPii: true` so Sentry can attach user IP + basic request
 * context (useful for correlating errors to specific users). BUT we do NOT want
 * auth cookies, session tokens, Authorization headers, or obvious PII (emails,
 * phone numbers) in raw form leaving the browser/server to a third party.
 *
 * This scrubber runs in both the client and server Sentry config's `beforeSend`
 * and `beforeSendTransaction`. It mutates the event in place and returns it.
 *
 * If you need to add a new sensitive field, add it here — do NOT disable
 * `sendDefaultPii` globally, because that also removes useful context like
 * `user.id` that we set via `Sentry.setUser({ id })` elsewhere.
 */

const REDACTED = '[REDACTED]'

// HTTP headers that frequently contain credentials. Lowercased.
const SENSITIVE_HEADER_KEYS = new Set<string>([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-access-token',
  'x-refresh-token',
  'proxy-authorization',
  // Session IDs / CSRF tokens — conservative.
  'x-csrf-token',
  'x-xsrf-token',
  'x-session-id',
])

// Body/query parameter keys whose values we always redact.
const SENSITIVE_FIELD_KEYS = new Set<string>([
  'password',
  'passwd',
  'pwd',
  'newpassword',
  'oldpassword',
  'currentpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'sessiontoken',
  'authorization',
  'cookie',
  'setcookie',
  'apikey',
  'apisecret',
  'clientsecret',
  'secret',
  'stripesecret',
  'otp',
  'pin',
  'ssn',
  'creditcard',
  'cardnumber',
  'cvv',
  'cvc',
])

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[_-]/g, '')
}

/** Redact sensitive HTTP header values in a header map (case-insensitive). */
function scrubHeaders(headers: unknown): unknown {
  if (!isPlainObject(headers)) return headers
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_KEYS.has(k.toLowerCase())) {
      out[k] = REDACTED
    } else {
      out[k] = v
    }
  }
  return out
}

/**
 * Walk an arbitrary JSON-ish value and redact any value whose key looks sensitive.
 * Does not traverse into binary/typed arrays.
 */
function scrubDataDeep(value: unknown, depth = 0): unknown {
  if (depth > 8) return value // safety cap
  if (Array.isArray(value)) {
    return value.map((v) => scrubDataDeep(v, depth + 1))
  }
  if (!isPlainObject(value)) return value
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_FIELD_KEYS.has(normalizeKey(k))) {
      out[k] = REDACTED
      continue
    }
    out[k] = scrubDataDeep(v, depth + 1)
  }
  return out
}

/** Redact query-string credentials like `?token=abc&password=...` in a URL. */
function scrubUrl(url: unknown): unknown {
  if (typeof url !== 'string') return url
  const qIdx = url.indexOf('?')
  if (qIdx < 0) return url
  const base = url.slice(0, qIdx)
  const rest = url.slice(qIdx + 1)
  let params: URLSearchParams
  try {
    params = new URLSearchParams(rest)
  } catch {
    return url
  }
  let mutated = false
  for (const key of Array.from(params.keys())) {
    if (SENSITIVE_FIELD_KEYS.has(normalizeKey(key))) {
      params.set(key, REDACTED)
      mutated = true
    }
  }
  if (!mutated) return url
  return `${base}?${params.toString()}`
}

/**
 * Apply scrubbing to a Sentry event (Error event or transaction).
 * Exported for testing; normally called from `beforeSend` / `beforeSendTransaction`.
 *
 * The generic `T extends object` lets this satisfy Sentry's `beforeSend` /
 * `beforeSendTransaction` signatures, which expect the event to be returned
 * as the same discriminated type (`ErrorEvent` / `TransactionEvent`).
 */
export function scrubSentryEvent<T extends object>(event: T | null | undefined): T | null {
  if (!event) return null
  const e = event as unknown as Record<string, unknown>

  // request.headers / request.cookies / request.data / request.url / request.query_string
  const request = e.request
  if (isPlainObject(request)) {
    if ('headers' in request) request.headers = scrubHeaders(request.headers)
    if ('cookies' in request) request.cookies = REDACTED
    if ('data' in request) request.data = scrubDataDeep(request.data)
    if ('url' in request) request.url = scrubUrl(request.url)
    if ('query_string' in request) request.query_string = scrubUrl(`?${request.query_string ?? ''}`)
  }

  // extra / contexts may include user-shaped objects we want to keep, but we still
  // walk them for sensitive keys.
  if (isPlainObject(e.extra)) e.extra = scrubDataDeep(e.extra)
  if (isPlainObject(e.contexts)) {
    for (const [k, v] of Object.entries(e.contexts)) {
      ;(e.contexts as Record<string, unknown>)[k] = scrubDataDeep(v)
    }
  }

  // breadcrumbs.data frequently contains `fetch` URLs + request/response bodies.
  if (Array.isArray(e.breadcrumbs)) {
    e.breadcrumbs = (e.breadcrumbs as unknown[]).map((b) => {
      if (!isPlainObject(b)) return b
      const copy: Record<string, unknown> = { ...b }
      if (isPlainObject(copy.data)) {
        const data: Record<string, unknown> = { ...(copy.data as Record<string, unknown>) }
        if ('url' in data) data.url = scrubUrl(data.url)
        if ('to' in data) data.to = scrubUrl(data.to)
        if ('from' in data) data.from = scrubUrl(data.from)
        if ('request_body' in data) data.request_body = scrubDataDeep(data.request_body)
        if ('response_body' in data) data.response_body = scrubDataDeep(data.response_body)
        if (isPlainObject(data.headers)) data.headers = scrubHeaders(data.headers)
        copy.data = data
      }
      return copy
    })
  }

  // user: keep id / ip_address, drop email/username payloads unless explicitly set.
  // (We don't strip `user` entirely because team debugging depends on correlating by id.)
  if (isPlainObject(e.user)) {
    const user = e.user as Record<string, unknown>
    // Leave `id`, `ip_address`, `segment` intact.
    // Redact anything else that could be PII.
    for (const key of Object.keys(user)) {
      if (!['id', 'ip_address', 'segment'].includes(key)) {
        if (SENSITIVE_FIELD_KEYS.has(normalizeKey(key))) user[key] = REDACTED
      }
    }
  }

  return e as unknown as T
}
