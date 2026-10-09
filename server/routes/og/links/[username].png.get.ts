/**
 * GET /og/links/:username.png — share card for a public links page. Fetched without cookies, so it
 * only draws pages the API serves publicly; everything else is a 404.
 */
import type { LinksPage } from '~/types/api'
import { cachedPng, ogPngHeaders } from '../../../utils/og-map-card'
import { fetchAvatarDataUri, renderLinksCardPng } from '../../../utils/og-links-card'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiBase = (config.apiBaseUrl as string) || 'http://localhost:3001/v1'
  const username = String(getRouterParam(event, 'username') ?? '').replace(/\.png$/i, '').trim().toLowerCase()
  if (!/^[a-z0-9_]{1,40}$/.test(username)) throw createError({ statusCode: 404 })

  // Keyed by username only, so a burst of scrapers costs one API call and one render per window.
  const png = await cachedPng(`links:${username}`, 300_000, async () => {
    const page = await $fetch<{ data: LinksPage }>(`${apiBase}/users/${encodeURIComponent(username)}/links`)
      .then((r) => r.data)
      .catch(() => null)
    if (!page?.user?.username) throw createError({ statusCode: 404 })
    const user = page.user
    return renderLinksCardPng({
      name: user.name ?? '',
      username: user.username,
      bio: user.bio,
      isOrganization: user.isOrganization,
      avatarDataUri: await fetchAvatarDataUri(user.avatarUrl),
    })
  })

  ogPngHeaders(event)
  return png
})
