import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('repost feed inclusion', () => {
  it('renders the reposter indicator around the original post', () => {
    const row = source('components/app/FeedPostRow.vue')
    expect(row).toContain("props.post.kind === 'repost'")
    expect(row).toContain('reposted')
    expect(row).toContain('props.post.repostedPost')
  })

  it('prepends a new repost to both home and own-profile feeds', () => {
    const repostState = source('composables/useRepostState.ts')
    expect(repostState).toContain('prependToHomeFeed(repostPost)')
    expect(repostState).toContain('prependToProfileFeed(repostPost)')
  })

  it('places top-level repost rows in both profile sections', () => {
    const profile = source('pages/u/[username].vue')
    expect(profile).toContain('postsOnlyPrependPost(post)')
    expect(profile).toContain('profilePrependPost(post)')
  })
})
