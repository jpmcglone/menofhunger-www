import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { postsFeedListQuery } from '~/composables/usePostsFeed'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('home feed query shape', () => {
  it('distinguishes Posts and Replies by topLevelOnly', () => {
    const postsQuery = postsFeedListQuery({
      visibility: 'all',
      followingOnly: false,
      sort: 'new',
      forYou: false,
      cursor: null,
      topLevelOnly: true,
    })
    const repliesQuery = postsFeedListQuery({
      visibility: 'all',
      followingOnly: false,
      sort: 'new',
      forYou: false,
      cursor: null,
      topLevelOnly: false,
    })

    expect(postsQuery.topLevelOnly).toBe(true)
    expect(repliesQuery.topLevelOnly).toBeUndefined()
  })

  it('keeps media For You, Following, and All requests distinct', () => {
    const forYouMedia = postsFeedListQuery({
      visibility: 'all',
      followingOnly: false,
      sort: 'new',
      forYou: true,
      cursor: null,
      mediaOnly: true,
      limit: 40,
    })
    const followingMedia = postsFeedListQuery({
      visibility: 'all',
      followingOnly: true,
      sort: 'new',
      forYou: false,
      cursor: null,
      mediaOnly: true,
      limit: 40,
    })
    const allMedia = postsFeedListQuery({
      visibility: 'all',
      followingOnly: false,
      sort: 'new',
      forYou: false,
      cursor: null,
      mediaOnly: true,
      limit: 40,
    })

    expect(forYouMedia).toMatchObject({ mediaOnly: true, sort: 'forYou', limit: 40 })
    expect(followingMedia).toMatchObject({ mediaOnly: true, followingOnly: true, limit: 40 })
    expect(allMedia).toMatchObject({ mediaOnly: true, limit: 40 })
    expect(allMedia.sort).toBeUndefined()
    expect(allMedia.followingOnly).toBeUndefined()
  })
})

describe('home feed refresh guardrails', () => {
  it('refreshes from the canonical request key', () => {
    const src = readFromRepo('composables/usePostsFeed.ts')
    expect(src).toContain('() => [feedEnabled(), currentRequestKey()] as const')
  })

  it('clamps collapsed reply footers to hidden direct replies', () => {
    const src = readFromRepo('components/app/FeedPostRow.vue')
    expect(src).toContain('const hiddenDirectReplies = Math.max(0, total - (hasVisibleChild ? 1 : 0))')
    expect(src).toContain('if (collapsed > 0) return Math.min(collapsed, hiddenDirectReplies)')
  })
})
