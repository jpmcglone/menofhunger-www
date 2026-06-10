/**
 * Per-Author Posts RSS Feed — GET /u/:username/posts/feed.xml
 */
import { buildPostRssFeed } from '../../../../utils/post-feed'
import type { FeedPostItem } from '../../../../utils/post-feed'

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username') ?? ''
  if (!username) { setResponseStatus(event, 404); return 'Not found' }

  const site = getRequestURL(event).origin
  const config = useRuntimeConfig(event)
  const apiBase = (config.apiBaseUrl as string) || 'http://localhost:3001/v1'

  let posts: FeedPostItem[] = []
  let authorName: string | null = null
  try {
    const res = await $fetch<{ data: FeedPostItem[] }>(`${apiBase}/posts`, {
      query: { username, limit: 50, sort: 'new', includeRestricted: true },
      timeout: 10_000,
    })
    posts = Array.isArray(res?.data) ? res.data : []
    if (posts.length > 0) {
      const a = posts[0]!.author
      authorName = a?.name ?? a?.username ?? null
    }
  } catch { /* return empty feed on API failure */ }

  const displayName = authorName ?? username
  const u = encodeURIComponent(username)

  const xml = buildPostRssFeed({
    feedUrl: `${site}/u/${u}/posts/feed.xml`,
    title: `${displayName} — Posts on Men of Hunger`,
    description: `Posts by ${displayName} on Men of Hunger.`,
    siteUrl: site,
    posts,
  })

  setResponseHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex')
  return xml
})
