/**
 * Tests for utils/api-error.ts sanitization.
 *
 * Ensures that raw technical strings (URLs, "Cannot GET /...", network errors, etc.)
 * never leak through getApiErrorMessage or getSafeUserErrorMessage.
 * Backend-provided clean messages from the { meta: { errors } } envelope are preserved.
 */

import { describe, expect, it, vi } from 'vitest'
import { getApiErrorMessage, getSafeUserErrorMessage } from '~/utils/api-error'

describe('api error message sanitization (user-facing)', () => {
  it('returns clean backend message from proper envelope', () => {
    const err = {
      data: {
        meta: {
          status: 400,
          errors: [{ code: 400, message: 'Phone number is invalid.' }],
        },
      },
    }
    expect(getApiErrorMessage(err)).toBe('Phone number is invalid.')
    expect(getSafeUserErrorMessage(err)).toBe('Phone number is invalid.')
  })

  it('returns null (and safe generic) for raw "Cannot GET" style fetch errors with query strings', () => {
    const raw = new Error('Cannot GET /posts?limit=30&collapseByRoot=true&...')
    expect(getApiErrorMessage(raw)).toBeNull()
    expect(getSafeUserErrorMessage(raw, 'Failed to load feed.')).toBe('Failed to load feed.')
    expect(getSafeUserErrorMessage(raw)).toBe('Something went wrong. Please try again.')
  })

  it('sanitizes network / fetch failure messages', () => {
    const cases = [
      'Failed to fetch',
      'Network request failed',
      'TypeError: fetch failed',
      'Load failed: https://api...',
    ]
    for (const msg of cases) {
      const e = new Error(msg)
      expect(getApiErrorMessage(e)).toBeNull()
      expect(getSafeUserErrorMessage(e)).toMatch(/Something went wrong|Please try again/)
    }
  })

  it('sanitizes URLs, ports, and internal paths', () => {
    const bads = [
      'Request failed for https://example.com/v1/foo',
      'Connection to localhost:3001 refused',
      'Error at api.menofhunger.com:443/path?token=abc123',
    ]
    for (const m of bads) {
      expect(getApiErrorMessage(new Error(m))).toBeNull()
    }
  })

  it('preserves clean short messages that happen to look a bit like errors but are user-facing', () => {
    // Backend intentionally returns user-friendly text; we should keep it.
    const clean = 'We could not find that post. It may have been deleted.'
    const err = { data: { meta: { status: 404, errors: [{ code: 404, message: clean }] } } }
    expect(getApiErrorMessage(err)).toBe(clean)
  })

  it('returns null for non-error inputs and falls back safely', () => {
    expect(getApiErrorMessage(null)).toBeNull()
    expect(getApiErrorMessage(undefined)).toBeNull()
    expect(getApiErrorMessage({ foo: 'bar' })).toBeNull()
    expect(getSafeUserErrorMessage({ foo: 'bar' })).toBe('Something went wrong. Please try again.')
  })

  it('does not leak technical strings even when dev warnings are active', () => {
    // The primary guarantee is that technical content never escapes the function.
    // The dev-only console.warn is best-effort and env-dependent in tests.
    const bad = new Error('Cannot GET /auth/phone/exists?phone=...')
    const result = getApiErrorMessage(bad)
    expect(result).toBeNull()
    // getSafe always gives a friendly string regardless.
    expect(getSafeUserErrorMessage(bad)).toMatch(/Something went wrong|Please try again/)
  })
})
