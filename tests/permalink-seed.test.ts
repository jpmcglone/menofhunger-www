import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { FeedPost } from '~/types/api'
import {
  clearPermalinkSeeds,
  consumePermalinkSeed,
  peekPermalinkSeed,
  seedPermalinkPost,
} from '~/utils/permalink-seed'

function post(partial: Partial<FeedPost> & { id: string }): FeedPost {
  return {
    body: '',
    visibility: 'public',
    kind: 'post',
    createdAt: new Date().toISOString(),
    media: [],
    author: {
      id: 'u1',
      username: 'alice',
      name: 'Alice',
      avatarUrl: null,
      premium: false,
      premiumPlus: false,
      isOrganization: false,
      verifiedStatus: 'none',
    },
    boostCount: 0,
    commentCount: 0,
    bookmarkCount: 0,
    viewerHasBoosted: false,
    viewerHasBookmarked: false,
    ...partial,
  } as FeedPost
}

afterEach(() => {
  clearPermalinkSeeds()
})

describe('permalink seed', () => {
  it('attaches the parent we replied to when the create response omitted it', () => {
    const parent = post({ id: 'p1', body: 'root' })
    const reply = post({ id: 'r1', body: 'reply', parentId: 'p1' })

    const seeded = seedPermalinkPost(reply, parent)

    expect(seeded.parent?.id).toBe('p1')
    expect(peekPermalinkSeed('r1')?.parent?.id).toBe('p1')
  })

  it('does not overwrite a parent already on the create response', () => {
    const existing = post({ id: 'existing', body: 'already' })
    const other = post({ id: 'other', body: 'nope' })
    const reply = post({ id: 'r2', parent: existing, parentId: 'existing' })

    const seeded = seedPermalinkPost(reply, other)

    expect(seeded.parent?.id).toBe('existing')
  })

  it('consume is one-shot so a later open refetches', () => {
    seedPermalinkPost(post({ id: 'p1' }))

    expect(consumePermalinkSeed('p1')?.id).toBe('p1')
    expect(consumePermalinkSeed('p1')).toBeUndefined()
    expect(peekPermalinkSeed('p1')).toBeUndefined()
  })

  it('permalink and toast paths seed before navigating to the new post', () => {
    const permalink = readFileSync(
      resolve('composables/usePostPermalink.ts'),
      'utf8',
    )
    const pending = readFileSync(
      resolve('composables/usePendingPostsManager.ts'),
      'utf8',
    )
    const composer = readFileSync(
      resolve('components/app/PostComposer.vue'),
      'utf8',
    )

    expect(permalink).toContain('peekPermalinkSeed')
    expect(permalink).toContain('consumePermalinkSeed')
    expect(pending).toContain('seedPermalinkPost(real, entry.optimisticPost.parent)')
    expect(composer).toContain('seedPermalinkPost(post)')
  })
})
