/**
 * Guardrail tests for social link utilities and profile header rendering rules.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'
import { buildSocialLinks, socialProfileUrl, SOCIAL_NETWORK_DESCRIPTORS } from '../utils/social-links'

const ROOT = join(__dirname, '..')

describe('socialProfileUrl', () => {
  it('builds the correct X URL', () => {
    expect(socialProfileUrl('x', 'TheMcGloneCode')).toBe('https://x.com/TheMcGloneCode')
  })

  it('builds the correct Pickax URL', () => {
    expect(socialProfileUrl('pickax', 'erin_pinson823')).toBe('https://pickax.com/erin_pinson823')
  })

  it('strips a leading @ from the handle', () => {
    expect(socialProfileUrl('x', '@hello')).toBe('https://x.com/hello')
  })
})

describe('buildSocialLinks', () => {
  it('returns X first, then Pickax', () => {
    const links = buildSocialLinks({ xUsername: 'user1', pickaxUsername: 'user2' })
    expect(links).toHaveLength(2)
    expect(links.at(0)?.network).toBe('x')
    expect(links.at(1)?.network).toBe('pickax')
  })

  it('omits links for null/empty handles', () => {
    const links = buildSocialLinks({ xUsername: null, pickaxUsername: '' })
    expect(links).toHaveLength(0)
  })

  it('includes only the non-empty handle', () => {
    const links = buildSocialLinks({ xUsername: 'hello', pickaxUsername: null })
    expect(links).toHaveLength(1)
    expect(links.at(0)?.network).toBe('x')
    expect(links.at(0)?.href).toBe('https://x.com/hello')
    expect(links.at(0)?.handle).toBe('hello')
  })

  it('builds correct href for each network', () => {
    const links = buildSocialLinks({ xUsername: 'jpmc', pickaxUsername: 'jpmc' })
    expect(links.at(0)?.href).toBe('https://x.com/jpmc')
    expect(links.at(1)?.href).toBe('https://pickax.com/jpmc')
  })

  it('strips leading @ from stored handle', () => {
    const links = buildSocialLinks({ xUsername: '@someone', pickaxUsername: null })
    expect(links.at(0)?.handle).toBe('someone')
    expect(links.at(0)?.href).toBe('https://x.com/someone')
  })
})

describe('SOCIAL_NETWORK_DESCRIPTORS order', () => {
  it('X comes before Pickax', () => {
    expect(SOCIAL_NETWORK_DESCRIPTORS.at(0)?.network).toBe('x')
    expect(SOCIAL_NETWORK_DESCRIPTORS.at(1)?.network).toBe('pickax')
  })

  it('X has an iconify icon (no image asset needed)', () => {
    const x = SOCIAL_NETWORK_DESCRIPTORS.find((d) => d.network === 'x')
    expect(x?.icon).toBeTruthy()
    expect(x?.icon).toMatch(/^tabler:/)
  })

  it('Pickax has an image path (no iconify icon available)', () => {
    const pickax = SOCIAL_NETWORK_DESCRIPTORS.find((d) => d.network === 'pickax')
    expect(pickax?.icon).toBeNull()
    expect(pickax?.image).toBeTruthy()
  })
})

describe('Header.vue social link markup guardrails', () => {
  const headerSrc = readFileSync(join(ROOT, 'components/app/profile/Header.vue'), 'utf8')

  it('renders social links with target="_blank"', () => {
    // The v-for social link block must have target="_blank"
    expect(headerSrc).toContain('target="_blank"')
  })

  it('renders social links with rel="noopener noreferrer nofollow"', () => {
    expect(headerSrc).toContain('rel="noopener noreferrer nofollow"')
  })

  it('imports buildSocialLinks', () => {
    expect(headerSrc).toContain('buildSocialLinks')
  })

  it('uses v-for over socialLinks', () => {
    expect(headerSrc).toContain('v-for="link in socialLinks"')
  })
})
