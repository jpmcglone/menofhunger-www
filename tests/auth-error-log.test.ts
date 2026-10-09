import { describe, expect, it } from 'vitest'
import { parse, stringify } from 'devalue'
import { getSafeAuthErrorDetails } from '~/utils/auth-error-log'

describe('auth dev-log serialization', () => {
  it('survives Nuxt serialization with a fetch error containing a request and nested errors', () => {
    const cause = Object.assign(new TypeError('fetch failed'), { code: 'ECONNREFUSED' })
    const failure = Object.assign(new Error('GET /auth/me?token=secret failed', { cause }), {
      request: new Request('http://localhost:3001/v1/auth/me', { headers: { cookie: 'moh_session=private' } }),
      response: { status: 503 },
    })
    const details = getSafeAuthErrorDetails(failure)
    const serialized = stringify(details)
    expect(parse(serialized)).toEqual({ name: 'Error', message: 'Request failed', status: 503, reason: null, code: 'ECONNREFUSED' })
    expect(serialized).not.toMatch(/secret|moh_session|localhost/)
  })

  it('keeps useful network diagnostics and handles missing errors', () => {
    expect(getSafeAuthErrorDetails(new TypeError('fetch failed'))).toMatchObject({ name: 'TypeError', message: 'fetch failed', status: null })
    expect(() => stringify(getSafeAuthErrorDetails(null))).not.toThrow()
  })
})
