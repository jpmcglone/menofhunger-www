import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('profile visibility filters (structural)', () => {
  it('opts profile posts/articles/media feeds into includeRestricted mode for full obfuscated display', () => {
    const profilePage = readFromRepo('pages/u/[username].vue')
    // All profile feeds pass includeRestricted: true so every tier appears (obfuscated as needed).
    const matches = [...profilePage.matchAll(/includeRestricted:\s*true/g)]
    expect(matches.length).toBeGreaterThanOrEqual(3)
  })

  it('forces media tab visibility to all while visibility controls are hidden', () => {
    const profilePage = readFromRepo('pages/u/[username].vue')
    expect(profilePage).toMatch(/const mediaVisibilityFilter = computed<ProfilePostsFilter>\(\(\) => 'all'\)/)
    expect(profilePage).toMatch(/visibility:\s*mediaVisibilityFilter/)
  })

  it('renders profile access-gate cards from effective CTA state', () => {
    const profilePage = readFromRepo('pages/u/[username].vue')
    expect(profilePage).toMatch(/const effectiveProfileCtaKind = computed<null \| 'verify' \| 'premium'>/)
    expect(profilePage).toMatch(/<AppAccessGateCard kind="verify" \/>/)
    expect(profilePage).toMatch(/<AppAccessGateCard kind="premium" \/>/)
  })

  it('filters pinned post display by active visibility filter', () => {
    const pinnedComposable = readFromRepo('composables/useProfilePinnedPost.ts')
    expect(pinnedComposable).toMatch(/if \(activeFilter\.value !== 'all' && p\.visibility !== activeFilter\.value\) return null/)
  })
})
