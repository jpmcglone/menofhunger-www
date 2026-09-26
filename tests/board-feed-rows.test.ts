import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import PostRow from '~/components/app/PostRow.vue'
import type { FeedPost } from '~/types/api'

const global = {
  stubs: {
    Icon: true,
    AppUserAvatar: true,
    AppPostRowLinkPreview: true,
    AppPostMediaGrid: true,
  },
}

function feedPost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 't1',
    createdAt: new Date().toISOString(),
    body: 'Started lifting at 5am in January.',
    deletedAt: null,
    kind: 'board',
    boardRootId: 't1',
    visibility: 'public',
    boostCount: 112,
    bookmarkCount: 0,
    commentCount: 48,
    repostCount: 3,
    viewerCount: 0,
    parentId: null,
    media: [],
    viewerHasBoosted: false,
    author: {
      id: 'u1',
      username: 'jameshale',
      name: 'James Hale',
      verifiedStatus: 'identity',
      premium: false,
      premiumPlus: false,
      isOrganization: false,
    } as FeedPost['author'],
    ...overrides,
  }
}

const thread = feedPost({
  board: { threadId: 't1', title: 'What a 5am lift did to my marriage', url: 'https://menofhunger.com/x', domain: 'menofhunger.com', tags: ['fitness', 'family'] },
})

let wrapper: VueWrapper | null = null
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

async function mountRow(post: FeedPost) {
  wrapper = await mountSuspended(PostRow, { props: { post }, global })
  return wrapper
}

describe('Board post row in feeds', () => {
  it('leads with the vertical Board boost and links the title to the thread', async () => {
    const w = await mountRow(thread)
    const row = w.find('[data-board-feed-row="post"]')
    expect(row.exists()).toBe(true)
    expect(row.find('button[aria-label="Boost"]').exists()).toBe(true)
    expect(w.find('button[aria-label="Upvote"]').exists()).toBe(false)
    const title = w.findAll('a').find((a) => a.text() === 'What a 5am lift did to my marriage')
    expect(title?.attributes('href')).toBe('/b/t1')
    expect(w.text()).toContain('menofhunger.com')
    expect(w.text()).toContain('#fitness')
    expect(w.find('button[aria-label="Reply"]').exists()).toBe(true)
    expect(w.find('button[aria-label="Repost"]').exists()).toBe(true)
    expect(w.text()).not.toContain('Join the discussion')
  })

  it('opens article-sourced posts on their discussion and drops the domain', async () => {
    const w = await mountRow(feedPost({
      body: '',
      board: { threadId: 't1', title: 'The quiet discipline of the second shift', url: 'https://menofhunger.com/a/a1', domain: 'menofhunger.com', tags: ['work'] },
      article: { id: 'a1', title: 'The quiet discipline', excerpt: 'Most men treat the hours after work as recovery.', thumbnailUrl: null, visibility: 'public', publishedAt: null, author: { id: 'u1', username: 'aaronk', name: 'Aaron King', avatarUrl: null, verifiedStatus: 'identity', premium: false, premiumPlus: false } },
    }))
    const title = w.findAll('a').find((a) => a.text() === 'The quiet discipline of the second shift')
    // The title opens the Board discussion like the rest of the row; "Read article" lives in "…".
    expect(title?.attributes('href')).toBe('/b/t1')
    expect(w.text()).toContain('Article')
    expect(w.text()).not.toContain('menofhunger.com')
    expect(w.text()).toContain('Most men treat the hours after work as recovery.')
  })

  it('shows a locked teaser with only the gate and share', async () => {
    const w = await mountRow(feedPost({
      body: '',
      visibility: 'premiumOnly',
      viewerCanAccess: false,
      commentCount: 22,
      board: { threadId: 't1', title: 'Show: I built a tiny app', url: null, domain: null, tags: [] },
    }))
    expect(w.find('[data-board-gate]').exists()).toBe(true)
    expect(w.find('button[aria-label="Share"]').exists()).toBe(true)
    expect(w.find('button[aria-label="Boost"]').attributes('disabled')).toBeDefined()
    expect(w.find('button[aria-label="Reply"]').exists()).toBe(false)
    expect(w.find('button[aria-label="Repost"]').exists()).toBe(false)
    expect(w.find('button[aria-label="Save post"]').exists()).toBe(false)
    expect(w.text()).toContain('22 comments')
    expect(w.text()).not.toContain('James Hale')
  })
})

describe('Board comment row in feeds', () => {
  it('names the thread and links the context to the comment permalink', async () => {
    const w = await mountRow(feedPost({ id: 'c1', parentId: 't1', body: 'The 9pm bedtime is the real fight.', parent: thread }))
    const row = w.find('[data-board-feed-row="comment"]')
    expect(row.exists()).toBe(true)
    const context = w.find('[data-board-comment-context]')
    expect(context.text()).toContain('commented on')
    expect(context.text()).toContain('What a 5am lift did to my marriage')
    expect(context.attributes('href')).toBe('/b/t1/c/c1')
    expect(w.text()).toContain('The 9pm bedtime is the real fight.')
    expect(row.find('button[aria-label="Boost"]').exists()).toBe(true)
    expect(w.find('button[aria-label="Repost"]').exists()).toBe(false)
    expect(w.text()).not.toMatch(/Board comment/i)
  })

  it('says who a reply answers and falls back when the thread title is missing', async () => {
    const parentComment = feedPost({ id: 'c0', parentId: 't1', author: { ...thread.author, username: 'john' }, parent: thread })
    const w = await mountRow(feedPost({ id: 'c2', parentId: 'c0', body: 'Gonna check it tonight', parent: parentComment }))
    const context = w.find('[data-board-comment-context]').text()
    expect(context).toContain('replied to')
    expect(context).toContain('@john')
    expect(context).toContain('What a 5am lift did to my marriage')

    wrapper?.unmount()
    const bare = await mountRow(feedPost({ id: 'c3', parentId: 't1', body: 'Nice' }))
    expect(bare.find('[data-board-comment-context]').text()).toContain('commented on a Board post')
  })

  it('uses the thread title the API sends even without the parent chain', async () => {
    const w = await mountRow(feedPost({ id: 'c4', parentId: 't1', body: 'Nice', boardThreadTitle: 'Take a stab at building iPhone apps rapidly' }))
    expect(w.find('[data-board-comment-context]').text()).toContain('commented on Take a stab at building iPhone apps rapidly')
  })
})
