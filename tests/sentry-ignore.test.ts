import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const client = readFileSync(resolve(process.cwd(), 'sentry.client.config.ts'), 'utf8')
const media = readFileSync(
  resolve(process.cwd(), 'components/app/PostMediaGrid.vue'),
  'utf8',
)

describe('Sentry client ignore list', () => {
  it('drops Facebook Android IAB postMessage noise (MENOFHUNGER-WWW-1V)', () => {
    expect(client).toContain('Error invoking postMessage: Java object is gone')
    expect(client).toContain('navigation_performance_logger_android')
  })
})

describe('PostMediaGrid TDZ (MENOFHUNGER-WWW-1T)', () => {
  it('declares items before the video watchEffect that reads it', () => {
    const itemsAt = media.indexOf('const items = computed')
    const watchAt = media.indexOf('watchEffect((onCleanup)')
    expect(itemsAt).toBeGreaterThan(-1)
    expect(watchAt).toBeGreaterThan(itemsAt)
  })
})
