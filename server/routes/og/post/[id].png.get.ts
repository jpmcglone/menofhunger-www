/**
 * GET /og/post/:id.png — share card for a public text post. Fetched without cookies, so only
 * posts the API returns as public are drawn; everything else is a 404.
 */
import type { FeedPost } from '~/types/api'
import { cachedPng, ogPngHeaders } from '../../../utils/og-map-card'
import { renderPostCardPng } from '../../../utils/og-post-card'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiBase = (config.apiBaseUrl as string) || 'http://localhost:3001/v1'
  const id = String(getRouterParam(event, 'id') ?? '').replace(/\.png$/i, '').trim()
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(id)) throw createError({ statusCode: 404 })

  const post = await $fetch<{ data: FeedPost }>(`${apiBase}/posts/${encodeURIComponent(id)}`)
    .then((r) => r.data)
    .catch(() => null)
  if (!post || post.deletedAt || post.visibility !== 'public' || !post.body?.trim()) {
    throw createError({ statusCode: 404 })
  }

  const png = await cachedPng(`post:${id}:${post.editedAt ?? post.createdAt}`, 600_000, () =>
    renderPostCardPng({
      authorName: post.author.name ?? '',
      username: post.author.username ?? 'member',
      body: post.body,
      commentCount: post.commentCount ?? 0,
    }),
  )

  ogPngHeaders(event)
  return png
})
