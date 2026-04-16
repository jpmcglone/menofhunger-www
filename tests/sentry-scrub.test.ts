import { describe, expect, it } from 'vitest'
import { scrubSentryEvent } from '../utils/sentry-scrub'

describe('scrubSentryEvent', () => {
  it('returns null for null/undefined input', () => {
    expect(scrubSentryEvent(null)).toBeNull()
    expect(scrubSentryEvent(undefined)).toBeNull()
  })

  it('redacts sensitive HTTP headers on request.headers (case-insensitive)', () => {
    const event = {
      request: {
        headers: {
          Authorization: 'Bearer abc',
          COOKIE: 'sid=xyz',
          'X-Api-Key': 'leaked',
          'User-Agent': 'Mozilla/5.0',
        },
      },
    }
    const out = scrubSentryEvent(event)!
    const headers = (out.request as { headers: Record<string, string> }).headers
    expect(headers.Authorization).toBe('[REDACTED]')
    expect(headers.COOKIE).toBe('[REDACTED]')
    expect(headers['X-Api-Key']).toBe('[REDACTED]')
    expect(headers['User-Agent']).toBe('Mozilla/5.0')
  })

  it('redacts request.cookies wholesale', () => {
    const event = {
      request: {
        cookies: 'sessionId=abc; auth=def',
      },
    }
    const out = scrubSentryEvent(event)!
    expect((out.request as { cookies: unknown }).cookies).toBe('[REDACTED]')
  })

  it('deep-redacts sensitive keys in request.data (ignoring case and separators)', () => {
    const event = {
      request: {
        data: {
          username: 'john',
          password: 'hunter2',
          New_Password: 'hunter3',
          nested: { accessToken: 'tok', refresh_token: 'r', safe: 'ok' },
          list: [{ secret: 'x' }, { pin: '1234' }, { safe: 'y' }],
        },
      },
    }
    const out = scrubSentryEvent(event)!
    const data = (out.request as { data: Record<string, unknown> }).data
    expect(data.username).toBe('john')
    expect(data.password).toBe('[REDACTED]')
    expect(data.New_Password).toBe('[REDACTED]')
    expect((data.nested as Record<string, unknown>).accessToken).toBe('[REDACTED]')
    expect((data.nested as Record<string, unknown>).refresh_token).toBe('[REDACTED]')
    expect((data.nested as Record<string, unknown>).safe).toBe('ok')
    const list = data.list as Array<Record<string, unknown>>
    expect(list[0]?.secret).toBe('[REDACTED]')
    expect(list[1]?.pin).toBe('[REDACTED]')
    expect(list[2]?.safe).toBe('y')
  })

  it('redacts sensitive query params in request.url', () => {
    const event = {
      request: {
        url: 'https://example.com/path?token=abc&foo=bar&password=p',
      },
    }
    const out = scrubSentryEvent(event)!
    const url = (out.request as { url: string }).url
    expect(url).toContain('token=%5BREDACTED%5D')
    expect(url).toContain('foo=bar')
    expect(url).toContain('password=%5BREDACTED%5D')
  })

  it('leaves URLs without sensitive params unchanged', () => {
    const event = { request: { url: 'https://example.com/path?page=2' } }
    const out = scrubSentryEvent(event)!
    expect((out.request as { url: string }).url).toBe('https://example.com/path?page=2')
  })

  it('scrubs breadcrumbs.data (url, body, headers)', () => {
    const event = {
      breadcrumbs: [
        {
          category: 'fetch',
          data: {
            url: 'https://api.example.com/login?token=abc',
            request_body: { password: 'p', email: 'a@b.com' },
            headers: { Authorization: 'Bearer x', Accept: 'application/json' },
          },
        },
      ],
    }
    const out = scrubSentryEvent(event)!
    const breadcrumbs = out.breadcrumbs as Array<{ data: { url: string; request_body: Record<string, unknown>; headers: Record<string, string> } }>
    const bc = breadcrumbs[0]!
    expect(bc.data.url).toContain('token=%5BREDACTED%5D')
    expect(bc.data.request_body.password).toBe('[REDACTED]')
    expect(bc.data.request_body.email).toBe('a@b.com')
    expect(bc.data.headers.Authorization).toBe('[REDACTED]')
    expect(bc.data.headers.Accept).toBe('application/json')
  })

  it('keeps user.id and user.ip_address intact', () => {
    const event = {
      user: {
        id: 'usr_123',
        ip_address: '1.2.3.4',
        segment: 'premium',
      },
    }
    const out = scrubSentryEvent(event)!
    expect((out.user as Record<string, unknown>).id).toBe('usr_123')
    expect((out.user as Record<string, unknown>).ip_address).toBe('1.2.3.4')
    expect((out.user as Record<string, unknown>).segment).toBe('premium')
  })

  it('does not throw on unusual shapes', () => {
    expect(() => scrubSentryEvent({})).not.toThrow()
    expect(() => scrubSentryEvent({ request: null as unknown })).not.toThrow()
    expect(() => scrubSentryEvent({ request: { headers: null as unknown } })).not.toThrow()
    expect(() => scrubSentryEvent({ breadcrumbs: [null, undefined, { data: null }] as unknown })).not.toThrow()
  })
})
