import { describe, expect, it } from 'vitest'
import { navCompactModePath } from '~/config/routes'

describe('Board navigation width', () => {
  it('uses the ordinary responsive rail on the Board and all its subpages', () => {
    for (const path of ['/b', '/b/thread', '/b/thread/c/comment', '/b/new', '/b/tags/ask']) {
      expect(navCompactModePath(path)).toBe(false)
    }
    expect(navCompactModePath('/radio')).toBe(true)
    expect(navCompactModePath('/admin/analytics')).toBe(true)
  })
})
