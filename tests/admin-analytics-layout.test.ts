import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readSurfaceSource } from './helpers/surface-source'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

function readAnalyticsPage(): string {
  return readSurfaceSource('pages/admin/analytics.vue')
}

describe('admin analytics layout', () => {
  it('orders sections by importance', () => {
    const page = readFromRepo('pages/admin/analytics.vue')
    const order: [label: string, section: string][] = [
      ['Overview', 'Overview'],
      ['Engagement', 'Engagement'],
      ['Monetization', 'Monetization'],
      ['Content', 'Content'],
      ['Groups', 'Groups'],
      ['Spaces', 'Spaces'],
      ['Coins', 'Coins'],
      ['M.A.R.V.', 'Marv'],
      ['Homepage', 'Homepage'],
    ]
    for (const [label, section] of order) {
      expect(readFromRepo(`components/app/admin/analytics/${section}.vue`)).toContain(`>${label}<`)
    }
    const indexes = order.map(([, section]) => page.indexOf(`<AppAdminAnalytics${section} `))
    expect(indexes.every((i) => i >= 0)).toBe(true)
    for (let i = 1; i < indexes.length; i++) {
      expect(indexes[i]).toBeGreaterThan(indexes[i - 1]!)
    }
  })

  it('keeps the hero to the numbers that matter', () => {
    const page = readAnalyticsPage()
    const hero = page.slice(page.indexOf('const summaryCards'), page.indexOf('const VISIBILITY_META'))
    expect(hero).toMatch(/label: 'Users'/)
    expect(hero).toMatch(/label: 'DAU'/)
    expect(hero).toMatch(/label: 'Paying'/)
    expect(hero).not.toMatch(/Banked Grants/)
    expect(hero).not.toMatch(/Coins in Economy/)
    expect(hero).not.toMatch(/Public Posts/)
    expect(hero).not.toMatch(/Published Articles/)
  })

  it('drops the all-spaces mode breakdown', () => {
    const page = readAnalyticsPage()
    expect(page).not.toMatch(/Mode Breakdown/)
    expect(page).not.toMatch(/spaceModeRows/)
  })

  it('asks Marv to brief the already-loaded analytics snapshot', () => {
    const page = readAnalyticsPage()
    expect(page).toMatch(/Ask Marv/)
    expect(page).toMatch(/\/admin\/analytics\/brief/)
    expect(page).toMatch(/analytics: data\.value/)
    expect(page).toMatch(/referrals: referralAnalytics\.value/)
  })
})
