import { describe, expect, it } from 'vitest'
import { postChainInvolvesAuthor } from '~/utils/post-block'

describe('postChainInvolvesAuthor', () => {
  const blocked = new Set(['blocked'])
  const by = (id: string, extra: Record<string, unknown> = {}) => ({ author: { id }, ...extra })

  it('matches the author, thread ancestors, and reposted or quoted posts', () => {
    expect(postChainInvolvesAuthor(by('blocked'), blocked)).toBe(true)
    expect(postChainInvolvesAuthor(by('a', { parent: by('b', { parent: by('blocked') }) }), blocked)).toBe(true)
    expect(postChainInvolvesAuthor(by('a', { repostedPost: by('blocked') }), blocked)).toBe(true)
    expect(postChainInvolvesAuthor(by('a', { quotedPost: by('blocked') }), blocked)).toBe(true)
  })

  it('keeps unrelated posts', () => {
    expect(postChainInvolvesAuthor(by('a', { parent: by('b') }), blocked)).toBe(false)
    expect(postChainInvolvesAuthor(by('blocked'), new Set())).toBe(false)
  })
})
