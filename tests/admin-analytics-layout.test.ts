import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readAnalyticsPage(): string {
  return readFileSync(resolve(process.cwd(), 'pages/admin/analytics.vue'), 'utf8')
}

describe('admin analytics layout', () => {
  it('orders sections by importance', () => {
    const page = readAnalyticsPage()
    const order = [
      '>Overview<',
      '>Engagement<',
      '>Monetization<',
      '>Content<',
      '>Groups<',
      '>Spaces<',
      '>Coins<',
      '>M.A.R.V.<',
      '>Homepage<',
    ]
    const indexes = order.map((label) => page.indexOf(label))
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
