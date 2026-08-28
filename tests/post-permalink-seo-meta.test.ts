import { describe, expect, it } from 'vitest'
import type { CommunityGroupPreview, FeedPost } from '~/types/api'
import {
  computePostPermalinkSeo,
  POST_PERMALINK_LOGO_OG,
  type PostPermalinkSeoInput,
} from '~/utils/post-permalink-seo-meta'

function group(overrides: Partial<CommunityGroupPreview> = {}): CommunityGroupPreview {
  return {
    id: 'g1',
    slug: 'cool-group',
    name: 'Cool Group',
    descriptionPreview: 'A friendly group for people who like things.',
    coverImageUrl: null,
    avatarImageUrl: 'https://cdn.example/groups/cool-group.png',
    joinPolicy: 'open',
    memberCount: 42,
    viewerMembership: null,
    viewerPendingApproval: false,
    ...overrides,
  }
}

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
  it('titles with @username and puts the post body only in the description', () => {
    const post = basePost({ body: LONG_PUBLIC_BODY })
    const r = computePostPermalinkSeo(
      input({
        post,
        bodyTextSansLinks: LONG_PUBLIC_BODY,
      }),
    )
    expect(r.title).toBe('@alice')
    expect(r.title).not.toContain('public post')
    expect(r.description.length).toBeGreaterThan(80)
    expect(r.description).toContain('public post')
    expect(r.author).toBe('@alice')
    expect(r.noindex).toBe(false)
    expect(r.ogType).toBe('article')
  })

  it('does not repeat the opening of the post in both title and description', () => {
    const body =
      "And it's a little ironic since you're so offended that he wouldn't be charitable"
    const r = computePostPermalinkSeo(
      input({ post: basePost({ body }), bodyTextSansLinks: body }),
    )
    expect(r.title).toBe('@alice')
    expect(r.description.startsWith("And it's a little ironic")).toBe(true)
    expect(r.title).not.toContain('ironic')
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
    expect(r.title).toBe('Photo · @alice')
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

  it('youtube-only post uses yt thumbnail as og:image (SSR-derivable, no fetch)', () => {
    const ytUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    const post = basePost({ body: ytUrl, media: [] })
    const r = computePostPermalinkSeo(
      input({
        post,
        previewLink: ytUrl,
        bodyTextSansLinks: '',
        linkMeta: null,
      }),
    )
    expect(r.image).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
    expect(r.imageAlt).toContain('YouTube video')
    expect(r.twitterCard).toBe('summary_large_image')
    const article = r.jsonLdGraph.find((x: any) => x?.['@type'] === 'Article') as any
    expect(article?.image).toContain('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
  })

  it('youtube post: linkMeta.imageUrl is ignored in favour of yt thumbnail', () => {
    const ytUrl = 'https://youtu.be/dQw4w9WgXcQ'
    const post = basePost({ body: ytUrl, media: [] })
    const r = computePostPermalinkSeo(
      input({
        post,
        previewLink: ytUrl,
        bodyTextSansLinks: '',
        linkMeta: { url: ytUrl, imageUrl: 'https://cdn.example/link-og.jpg', title: 'Rick Roll', description: null, siteName: null, socialPost: null, videoEmbed: null },
      }),
    )
    expect(r.image).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg')
    expect(r.imageAlt).toContain('YouTube video: Rick Roll')
  })

  it('youtube post: uploaded media still wins over yt thumbnail', () => {
    const ytUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    const post = basePost({ body: `check this out ${ytUrl}` })
    const photoUrl = 'https://cdn.example/photo.jpg'
    const r = computePostPermalinkSeo(
      input({
        post,
        previewLink: ytUrl,
        bodyTextSansLinks: 'check this out',
        primaryMedia: { url: photoUrl, kind: 'image', width: 1200, height: 800 },
      }),
    )
    expect(r.image).toBe(photoUrl)
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
    expect(r.title).toBe('@alice')
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
    expect(r.title).toBe('@alice')
    expect(r.title).not.toContain('fifteen')
  })

  it('short post (<10 words): API empty body → Post by @user + gate', () => {
    const post = basePost({
      visibility: 'verifiedOnly',
      body: '',
      viewerCanAccess: false,
    })
    const r = computePostPermalinkSeo(input({ post, bodyTextSansLinks: '' }))
    expect(r.title).toBe('@alice')
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

describe('computePostPermalinkSeo — group affiliation', () => {
  it('public text post in a group: title + description + jsonLd reference the group', () => {
    const g = group()
    const post = basePost({ body: LONG_PUBLIC_BODY, groupPreview: g })
    const r = computePostPermalinkSeo(
      input({ post, bodyTextSansLinks: LONG_PUBLIC_BODY }),
    )
    expect(r.title).toContain('· in Cool Group')
    expect(r.description).toContain('From the Cool Group group on Men of Hunger')
    expect(r.group?.name).toBe('Cool Group')
    expect(r.group?.url).toContain('/g/cool-group')
    const groupNode = r.jsonLdGraph.find(
      (x: any) => x?.['@type'] === 'Organization' && String(x?.['@id'] ?? '').endsWith('#group'),
    ) as any
    expect(groupNode?.name).toBe('Cool Group')
    const article = r.jsonLdGraph.find((x: any) => x?.['@type'] === 'Article') as any
    expect(article?.articleSection).toBe('Cool Group')
    expect(article?.isPartOf?.['@id']).toContain('#group')
  })

  it('public text post in a group with no media: og:image falls back to group avatar before user avatar', () => {
    const g = group({ avatarImageUrl: 'https://cdn.example/groups/cg.png' })
    const post = basePost({
      body: 'short',
      author: author({ avatarUrl: 'https://cdn.example/avatars/alice.jpg' }),
      groupPreview: g,
    })
    const r = computePostPermalinkSeo(input({ post, bodyTextSansLinks: 'short' }))
    expect(r.image).toBe('https://cdn.example/groups/cg.png')
    expect(r.imageAlt).toContain('Cool Group group avatar')
  })

  it('public photo post in a group: photo still wins over group avatar but group still surfaces in title', () => {
    const g = group()
    const post = basePost({ body: '', groupPreview: g })
    const r = computePostPermalinkSeo(
      input({
        post,
        bodyTextSansLinks: '',
        primaryMedia: { url: 'https://cdn.example/photo.jpg', kind: 'image', width: 1200, height: 800 },
      }),
    )
    expect(r.image).toBe('https://cdn.example/photo.jpg')
    expect(r.title).toBe('Photo · @alice · in Cool Group')
  })

  it('public text post in a group with no group avatar and no user avatar: falls back to logo', () => {
    const g = group({ avatarImageUrl: null })
    const post = basePost({
      body: 'short',
      author: author({ avatarUrl: '' }),
      groupPreview: g,
    })
    const r = computePostPermalinkSeo(input({ post, bodyTextSansLinks: 'short' }))
    expect(r.image).toBe(POST_PERMALINK_LOGO_OG)
  })

  it('verified-only post in a group: still mentions group + uses group avatar before user avatar', () => {
    const g = group({ avatarImageUrl: 'https://cdn.example/groups/cg.png' })
    const post = basePost({
      visibility: 'verifiedOnly',
      body: 'teaser…',
      viewerCanAccess: false,
      groupPreview: g,
    })
    const r = computePostPermalinkSeo(input({ post, bodyTextSansLinks: '' }))
    expect(r.title).toContain('· in Cool Group')
    expect(r.description).toContain('verified members')
    expect(r.description).toContain('From the Cool Group group')
    expect(r.image).toBe('https://cdn.example/groups/cg.png')
    expect(r.group?.name).toBe('Cool Group')
    const article = r.jsonLdGraph.find((x: any) => x?.['@type'] === 'Article') as any
    expect(article?.articleSection).toBe('Cool Group')
    expect(article?.isAccessibleForFree).toBe(false)
  })

  it('public post with replies appends reply count to description', () => {
    const post = basePost({ commentCount: 7, body: LONG_PUBLIC_BODY })
    const r = computePostPermalinkSeo(input({ post, bodyTextSansLinks: LONG_PUBLIC_BODY }))
    expect(r.description).toContain('7 replies on Men of Hunger')
  })

  it('onlyMe post in a group: never leaks group affiliation', () => {
    const g = group()
    const post = basePost({ visibility: 'onlyMe', body: 'private', groupPreview: g })
    const r = computePostPermalinkSeo(input({ post, bodyTextSansLinks: 'private' }))
    expect(r.title).not.toContain('Cool Group')
    expect(r.description).not.toContain('Cool Group')
    expect(r.group).toBeNull()
    const article = r.jsonLdGraph.find((x: any) => x?.['@type'] === 'Article') as any
    expect(article?.articleSection).toBeUndefined()
  })

  it('post with malformed group preview (missing slug) ignores it', () => {
    const post = basePost({
      body: LONG_PUBLIC_BODY,
      groupPreview: group({ slug: '' }) as CommunityGroupPreview,
    })
    const r = computePostPermalinkSeo(input({ post, bodyTextSansLinks: LONG_PUBLIC_BODY }))
    expect(r.group).toBeNull()
    expect(r.title).not.toContain('Cool Group')
  })
})
