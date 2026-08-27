import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  TAB_RETURN_REFRESH_MIN_MS,
  shouldRefreshTabReturn,
} from '~/composables/useTabReturnRefreshGate'

describe('shouldRefreshTabReturn', () => {
  it('refreshes on the first visit', () => {
    expect(shouldRefreshTabReturn({
      lastSuccessMs: 0,
      lastBackgroundedMs: 0,
      nowMs: 1_000,
    })).toBe(true)
  })

  it('skips when recently fetched and still visible', () => {
    expect(shouldRefreshTabReturn({
      lastSuccessMs: 1_000,
      lastBackgroundedMs: 0,
      nowMs: 1_000 + 10_000,
    })).toBe(false)
  })

  it('refreshes after the document was hidden', () => {
    expect(shouldRefreshTabReturn({
      lastSuccessMs: 1_000,
      lastBackgroundedMs: 1_005,
      nowMs: 1_006,
    })).toBe(true)
  })

  it('refreshes after the 30s interval', () => {
    expect(shouldRefreshTabReturn({
      lastSuccessMs: 1_000,
      lastBackgroundedMs: 0,
      nowMs: 1_000 + TAB_RETURN_REFRESH_MIN_MS,
    })).toBe(true)
  })
})

describe('tab-return refresh wiring', () => {
  it('gates home and notifications keepalive catch-up', () => {
    const home = readFileSync(resolve(process.cwd(), 'pages/home.vue'), 'utf8')
    const notifications = readFileSync(resolve(process.cwd(), 'pages/notifications.vue'), 'utf8')
    expect(home).toContain("useTabReturnRefreshGate('home')")
    expect(home).toContain('homeTabReturnGate.shouldRefresh()')
    expect(notifications).toContain("useTabReturnRefreshGate('notifications')")
    expect(notifications).toContain('notificationsTabReturnGate.shouldRefresh()')
    expect(notifications).toContain('markDeliveredInBackground(true)')
  })
})
