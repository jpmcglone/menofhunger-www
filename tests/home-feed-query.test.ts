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

  it('sends trending sort for Following and All media', () => {
    const followingTrendingMedia = postsFeedListQuery({
      visibility: 'all',
      followingOnly: true,
      sort: 'trending',
      forYou: false,
      cursor: null,
      mediaOnly: true,
      limit: 40,
    })
    const allTrendingMedia = postsFeedListQuery({
      visibility: 'all',
      followingOnly: false,
      sort: 'trending',
      forYou: false,
      cursor: null,
      mediaOnly: true,
      limit: 40,
    })

    expect(followingTrendingMedia).toMatchObject({ mediaOnly: true, followingOnly: true, sort: 'trending' })
    expect(allTrendingMedia).toMatchObject({ mediaOnly: true, sort: 'trending' })
    expect(allTrendingMedia.followingOnly).toBeUndefined()
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

  it('keeps feed post rows clickable before child stop handlers can swallow clicks', () => {
    const postRow = readFromRepo('components/app/PostRow.vue')
    const linkPreview = readFromRepo('components/app/post/PostRowLinkPreview.vue')

    expect(postRow).toContain('@click.capture="onRowClick"')
    expect(postRow).toContain('@auxclick.capture="onRowAuxClick"')
    expect(postRow).toContain("'[data-post-row-interactive]'")
    expect(postRow).not.toContain('<div v-if="$slots.threadFooter" class="mt-1" @click.stop>')
    expect(linkPreview).toContain('data-post-row-interactive')
  })
})
