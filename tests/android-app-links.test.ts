// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { androidAppLinks } from '../server/utils/android-app-links'

mockNuxtImport('useRuntimeConfig', () => () => ({ androidAppSha256Fingerprints: '' }))

// Synthetic certificates are test data only; production config has no default fingerprint.
const first = Array.from({ length: 32 }, (_, index) => index.toString(16).padStart(2, '0')).join(':')
const second = Array.from({ length: 32 }, (_, index) => (index + 32).toString(16).padStart(2, '0')).join(':')

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

describe('production Android website association', () => {
  it('fails closed with absent or malformed signing configuration', () => {
    for (const input of ['', ' ', 'debug', first.replaceAll(':', ''), `${first},`, `${first},bad`]) {
      expect(androidAppLinks(input)).toEqual([])
    }
  })

  it('publishes only the production package and explicitly configured release fingerprints', () => {
    expect(androidAppLinks(` ${first},${second},${first.toUpperCase()} `)).toEqual([{
      relation: ['delegate_permission/common.handle_all_urls'],
      target: { namespace: 'android_app', package_name: 'com.menofhunger.app', sha256_cert_fingerprints: [first.toUpperCase(), second.toUpperCase()] },
    }])
  })

  it('serves JSON without authentication and fails closed through runtime config', async () => {
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    const headers = vi.fn()
    vi.stubGlobal('setResponseHeader', headers)
    const handler = (await import('../server/routes/.well-known/assetlinks.json.get')).default
    expect(handler({} as never)).toEqual([])
    expect(headers).toHaveBeenCalledWith({}, 'content-type', 'application/json; charset=utf-8')
    expect(headers).toHaveBeenCalledWith({}, 'cache-control', 'public, max-age=300')
  })
})
