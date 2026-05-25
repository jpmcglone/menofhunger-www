import type { ApiErrorEnvelope } from '~/types/api'

/**
 * Recommended friendly fallback strings for common surfaces.
 * Use these (or very close variants) for consistency across the app.
 * All user-facing errors must ultimately go through getSafeUserErrorMessage
 * (or the UserErrorMessage component) so technical details never leak.
 */
export const FRIENDLY_ERROR_FALLBACKS = {
  generic: 'Something went wrong. Please try again.',
  loadFailed: 'Failed to load. Please try again.',
  saveFailed: 'Failed to save. Please try again.',
  actionFailed: 'Action failed. Please try again.',
  network: 'Network error. Please check your connection and try again.',
} as const

type MaybeFetchError = {
  data?: unknown
  response?: { _data?: unknown } | null
  message?: string
}

/**
 * Heuristic detector for raw/technical error strings that must never be shown to end users.
 * Covers common cases from fetch failures, proxy 404/5xx, misconfigured bases, network errors, etc.
 */
function isLikelyTechnicalErrorMessage(msg: string | null | undefined): boolean {
  if (!msg) return false
  const s = String(msg).trim()
  if (!s) return false

  // Fast reject for obviously technical/debug strings.
  const technicalPatterns: RegExp[] = [
    /https?:\/\//i, // any full URL
    /\bCannot (GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)\b/i,
    /\b(GET|POST|PUT|DELETE|PATCH|HEAD)\s+\/[A-Za-z0-9_\/.\-?=&%]/i,
    /\b(fetch failed|failed to fetch|network request failed|load failed|network error)\b/i,
    /\b(TypeError|SyntaxError|ReferenceError|Error:)\b/i,
    /\bstatus\s*[:=]?\s*\d{3}\b/i,
    /:\d{2,5}\b/i, // any :port (word boundary after) — covers 443, 3001, etc. even when followed by text like "refused"
    /[?&][a-z_][a-z0-9_]*=[^&\s]{8,}/i, // long query values typical in debug URLs
    /\/v\d+\/|\/api\//i, // versioned or internal api paths
    /\b(errno|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN)\b/i,
    /<(!DOCTYPE|html|body|head)/i, // HTML fragments
    /\bstack|at .* \(/i, // stack traces
    /[a-z0-9.-]+\.[a-z]{2,}:?\d*\//i, // hostnames with paths (api.example.com/...)
  ]

  return technicalPatterns.some((re) => re.test(s))
}

export function getApiErrorMessage(e: unknown): string | null {
  const maybe = e as MaybeFetchError | null | undefined
  const data =
    (maybe?.data as ApiErrorEnvelope | undefined) ??
    (maybe?.response?._data as ApiErrorEnvelope | undefined)

  const first = data?.meta?.errors?.[0]
  let candidate: string | null = null
  if (first?.message) candidate = first.message
  else if (e instanceof Error) candidate = e.message
  else if (typeof maybe?.message === 'string') candidate = maybe.message

  if (candidate && isLikelyTechnicalErrorMessage(candidate)) {
    // Defense-in-depth: never let technical strings through this API.
    if (import.meta?.dev) {
      console.warn('[moh] Suppressed technical error message from user UI (dev only).', {
        rawCandidate: candidate,
        originalError: e,
      })
    }
    return null
  }

  return candidate || null
}

/**
 * Always returns a short, human-readable, non-technical error string suitable for UI.
 * Prefers a clean message from the backend error envelope when present.
 * Falls back to a friendly generic (or caller-provided fallback) for network failures,
 * misrouted requests, raw fetch errors, etc.
 *
 * Prefer this (or the UserErrorMessage component) for all user-facing error display.
 */
export function getSafeUserErrorMessage(e: unknown, fallback?: string): string {
  // If caller passed an already-extracted friendly string (common pattern: error.value = getter() || 'msg'),
  // treat short non-technical strings as clean and return them as-is. This makes the helper idempotent.
  if (typeof e === 'string') {
    const trimmed = e.trim()
    if (trimmed && !isLikelyTechnicalErrorMessage(trimmed)) {
      return trimmed
    }
    // If it was a technical string somehow passed directly, fall through to generic.
  }

  const clean = getApiErrorMessage(e)
  if (clean) return clean
  return fallback || 'Something went wrong. Please try again.'
}

/*
Usage (preferred):

import { getSafeUserErrorMessage } from '~/utils/api-error'
import { useAppToast } from '~/composables/useAppToast'

const toast = useAppToast()
try { ... } catch (e) {
  error.value = getSafeUserErrorMessage(e, 'Failed to load X.')
  // or for toasts:
  toast.pushError(e, 'Action failed.')
}

// For templates / components:
<UserErrorMessage :error="someError" fallback="Could not load suggestions." />

All raw technical strings ("Cannot GET /...", URLs, fetch errors, etc.) are stripped.
The low-level getApiErrorMessage is available for rare internal/debug use but should not be rendered directly.
*/
