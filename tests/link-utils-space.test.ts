import { describe, expect, it, vi } from 'vitest'

vi.mock('~/config/site', () => ({
  siteConfig: { url: 'https://menofhunger.com' },
}))

import {
  extractMohSpaceId,
  extractMohSpaceUsername,
  isMohSpaceLink,
} from '~/utils/link-utils'

describe('space link extractors', () => {
  it('extracts space id only from /spaces/:id', () => {
    expect(extractMohSpaceId('https://menofhunger.com/spaces/clxyz123')).toBe('clxyz123')
    expect(extractMohSpaceId('https://menofhunger.com/s/jp')).toBeNull()
  })

  it('extracts username only from /s/:username', () => {
    expect(extractMohSpaceUsername('https://menofhunger.com/s/jp')).toBe('jp')
    expect(extractMohSpaceUsername('https://menofhunger.com/s/Some_User')).toBe('Some_User')
    expect(extractMohSpaceUsername('https://menofhunger.com/spaces/clxyz123')).toBeNull()
  })

  it('detects either form as a space link', () => {
    expect(isMohSpaceLink('https://menofhunger.com/s/jp')).toBe(true)
    expect(isMohSpaceLink('https://menofhunger.com/spaces/clxyz123')).toBe(true)
    expect(isMohSpaceLink('https://menofhunger.com/u/jp')).toBe(false)
  })
})
