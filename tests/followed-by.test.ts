import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { followedByLabel } from '~/utils/followed-by'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('followedByLabel', () => {
  it('names one follower', () => {
    expect(followedByLabel([{ name: 'Marv' }], 1)).toBe('Followed by Marv')
  })

  it('names two followers', () => {
    expect(followedByLabel([{ name: 'Marv' }, { name: 'Erika' }], 2)).toBe('Followed by Marv and Erika')
  })

  it('counts the rest when there are more than the preview', () => {
    expect(followedByLabel([{ name: 'Marv' }, { name: 'Erika' }, { name: 'Tim' }], 27)).toBe(
      'Followed by Marv, Erika and Tim and 24 others you follow',
    )
  })

  it('uses the singular for exactly one other', () => {
    expect(followedByLabel([{ name: 'Marv' }], 2)).toBe('Followed by Marv and 1 other you follow')
  })

  it('falls back to the handle when a display name is missing', () => {
    expect(followedByLabel([{ name: null, username: 'worthy' }], 1)).toBe('Followed by worthy')
  })

  it('shows nothing when nobody you follow follows them', () => {
    expect(followedByLabel([], 0)).toBeNull()
    expect(followedByLabel([{ name: 'Marv' }], 0)).toBeNull()
  })
})

describe('profile header wiring', () => {
  it('puts notifications, more, message and follow in one top-right cluster', () => {
    const src = readFromRepo('components/app/profile/Header.vue')
    const cluster = src.slice(src.indexOf('profile-visitor-actions'))
    const order = ['aria-label="More"', 'aria-label="Message"', 'AppFollowButton']
    let cursor = 0
    for (const needle of order) {
      const at = cluster.indexOf(needle, cursor)
      expect(at, `${needle} in cluster order`).toBeGreaterThan(-1)
      cursor = at
    }
    expect(src).toContain('justify-end gap-2')
  })

  it('shows the affiliate count only when the API sends one', () => {
    const src = readFromRepo('components/app/profile/Header.vue')
    expect(src).toContain('v-if="affiliateCount !== null"')
    expect(src).toContain("emit('openAffiliates')")
  })
})
