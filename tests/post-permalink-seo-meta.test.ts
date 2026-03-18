import { describe, expect, it } from 'vitest'
import type { FeedPost } from '~/types/api'
import {
  computePostPermalinkSeo,
  POST_PERMALINK_LOGO_OG,
  type PostPermalinkSeoInput,
} from '~/utils/post-permalink-seo-meta'

const LONG_PUBLIC_BODY =
  'This is a public post with enough text to show up in share previews and search results clearly for everyone.'

function author(overrides: Partial<FeedPost['author']> = {}): FeedPost['author'] {
  return {
    id: 'u1',
    username: 'alice',
    name: 'Alice Display',
    premium: false,
    premiumPlus: false,
    isOrganization: false,
    stewardBadgeEnabled: false,
    verifiedStatus: 'manual',
    avatarUrl: 'https://cdn.example/avatars/alice.jpg',
    orgAffiliations: [],
    ...overrides,
  }
}

function basePost(overrides: Partial<FeedPost> = {}): FeedPost {
  return {
    id: 'post-1',
    createdAt: '2025-06-01T12:00:00.000Z',
    body: LONG_PUBLIC_BODY,
    deletedAt: null,
    visibility: 'public',
    boostCount: 0,
    bookmarkCount: 0,
    media: [],
    author: author(),
    viewerCanAccess: true,
    ...overrides,
  } as FeedPost
}

function input(partial: Partial<PostPermalinkSeoInput> & { post: FeedPost | null }): PostPermalinkSeoInput {
  const {
    post,
    postId,
    errorText,
    isRestricted,
    restrictionLabel,
    restrictionSeoDescription,
    previewLink,
    linkMeta,
    primaryMedia,
    extraOgMediaUrls,
    primaryVideo,
    bodyTextSansLinks,
  } = partial
  return {
    post,
    postId: postId ?? post?.id ?? 'post-1',
    errorText: errorText ?? null,
    isRestricted: isRestricted ?? false,
    restrictionLabel: restrictionLabel ?? 'Post',
    restrictionSeoDescription: restrictionSeoDescription ?? 'Unavailable.',
    previewLink: previewLink ?? null,
    linkMeta: linkMeta ?? null,
    primaryMedia: primaryMedia ?? null,
    extraOgMediaUrls: extraOgMediaUrls ?? [],
    primaryVideo: primaryVideo ?? null,
    bodyTextSansLinks:
      bodyTextSansLinks ?? (post ? post.body.replace(/\s+/g, ' ').trim() : ''),
  }
}

describe('computePostPermalinkSeo — public posts', () => {
  it('titles with shared-by @username and uses substantial description', () => {
    const post = basePost({ body: LONG_PUBLIC_BODY })
    const r = computePostPermalinkSeo(
      input({
        post,
        bodyTextSansLinks: LONG_PUBLIC_BODY,
      }),
    )
    expect(r.title).toContain('shared by @alice')
    expect(r.title).toContain('alice')
    expect(r.description.length).toBeGreaterThan(80)
    expect(r.description).toContain('public post')
    expect(r.author).toBe('@alice')
    expect(r.noindex).toBe(false)
    expect(r.ogType).toBe('article')
  })

  it('og:image prefers media over avatar over logo', () => {
    const photoUrl = 'https://cdn.example/photo.jpg'
    const post = basePost({ body: '' })
    const r = computePostPermalinkSeo(
      input({
        post,
        bodyTextSansLinks: '',
        primaryMedia: { url: photoUrl, kind: 'image', width: 1200, height: 800 },
      }),
    )
    expect(r.image).toBe(photoUrl)
    expect(r.title).toMatch(/Photo — shared by @alice/)
    const person = r.jsonLdGraph.find((x: any) => x['@type'] === 'Person') as any
    expect(person.name).toBe('@alice')
    expect(person.url).toContain('/u/alice')
  })

  it('video poster wins over mp4 url for og:image', () => {
    const thumb = 'https://cdn.example/thumb.jpg'
    const mp4 = 'https://cdn.example/v.mp4'
    const post = basePost({ body: 'x' })
    const r = computePostPermalinkSeo(
      input({
        post,
        bodyTextSansLinks: 'x',
        primaryMedia: { url: mp4, thumbnailUrl: thumb, kind: 'video', width: 1280, height: 720 },
        primaryVideo: { url: mp4, width: 1280, height: 720 },
      }),
    )
    expect(r.image).toBe(thumb)
    expect(r.ogVideoAbsoluteUrl).toBe(mp4)
    const article = r.jsonLdGraph.find((x: any) => x?.video?.['@type'] === 'VideoObject') as any
    expect(article.video.contentUrl).toBe(mp4)
  })

  it('text-only uses avatar then logo', () => {
    const post = basePost({
      body: 'short',
      author: author({ avatarUrl: '' }),
    })
    const r = computePostPermalinkSeo(input({ post, bodyTextSansLinks: 'short' }))
    expect(r.image).toBe(POST_PERMALINK_LOGO_OG)
    const post2 = basePost({ body: 'short', author: author({ avatarUrl: 'https://a/av.png' }) })
    const r2 = computePostPermalinkSeo(input({ post: post2, bodyTextSansLinks: 'short' }))
    expect(r2.image).toBe('https://a/av.png')
  })

  it('emits secondary og images only for public', () => {
    const post = basePost()
    const r = computePostPermalinkSeo(
      input({
        post,
        bodyTextSansLinks: post.body,
        extraOgMediaUrls: ['https://cdn.example/b.jpg'],
      }),
    )
    expect(r.ogImageSecondaryAbsoluteUrls.length).toBe(1)
    expect(r.ogImageSecondaryAbsoluteUrls[0]).toContain('b.jpg')
  })
})

describe('computePostPermalinkSeo — verified-only', () => {
  const longBody =
    'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen'

  it('logged-out shape: teaser + gate in description, avatar og:image, indexable', () => {
    const apiBody = longBody.slice(0, 22) + '…'
    const post = basePost({
      visibility: 'verifiedOnly',
      body: apiBody,
      viewerCanAccess: false,
    })
    const r = computePostPermalinkSeo(
      input({
        post,
        bodyTextSansLinks: '',
      }),
    )
    expect(r.title).toContain('@alice')
    expect(r.title).toMatch(/— @alice$/)
    expect(r.description).toContain('verified members')
    expect(r.description).toContain('…')
    expect(r.image).toBe('https://cdn.example/avatars/alice.jpg')
    expect(r.noindex).toBe(false)
    expect(r.ogImageSecondaryAbsoluteUrls).toEqual([])
    expect(r.ogVideoAbsoluteUrl).toBeNull()
    const article = r.jsonLdGraph[0] as any
    expect(article.isAccessibleForFree).toBe(false)
    expect(article.author.name).toBe('@alice')
  })

  it('member view: og uses gated teaser from full body (not full post text)', () => {
    const post = basePost({
      visibility: 'verifiedOnly',
      body: longBody,
      viewerCanAccess: true,
    })
    const r = computePostPermalinkSeo(
      input({
        post,
        bodyTextSansLinks: longBody,
      }),
    )
    expect(r.description).toContain('verified members')
    expect(r.description.length).toBeLessThan(120)
    expect(r.title).not.toContain('fifteen')
    expect(r.title).toContain('@alice')
  })

  it('short post (<10 words): API empty body → Post by @user + gate', () => {
    const post = basePost({
      visibility: 'verifiedOnly',
      body: '',
      viewerCanAccess: false,
    })
    const r = computePostPermalinkSeo(input({ post, bodyTextSansLinks: '' }))
    expect(r.title).toBe('Post by @alice')
    expect(r.description).toContain('Post by @alice')
    expect(r.description).toContain('verified members')
  })
})

describe('computePostPermalinkSeo — premium-only', () => {
  it('description references premium members', () => {
    const longBody =
      'alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november'
    const post = basePost({
      visibility: 'premiumOnly',
      body: longBody.slice(0, 22) + '…',
      viewerCanAccess: false,
    })
    const r = computePostPermalinkSeo(input({ post, bodyTextSansLinks: '' }))
    expect(r.description).toContain('premium members')
    expect(r.title).toContain('@alice')
    const article = r.jsonLdGraph[0] as any
    expect(article.isAccessibleForFree).toBe(false)
  })
})

describe('computePostPermalinkSeo — onlyMe & errors', () => {
  it('onlyMe is noindex', () => {
    const post = basePost({ visibility: 'onlyMe', body: 'secret' })
    const r = computePostPermalinkSeo(input({ post, bodyTextSansLinks: 'secret' }))
    expect(r.noindex).toBe(true)
    expect(r.title).toContain('Private post')
    expect(r.ogType).toBe('website')
  })

  it('error with no post: noindex and restriction copy', () => {
    const r = computePostPermalinkSeo(
      input({
        post: null,
        errorText: 'gone',
        isRestricted: true,
        restrictionLabel: 'Post unavailable',
        restrictionSeoDescription: 'Not found.',
      }),
    )
    expect(r.noindex).toBe(true)
    expect(r.title).toBe('Post unavailable')
    expect(r.description).toBe('Not found.')
  })
})
