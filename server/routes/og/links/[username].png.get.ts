/**
 * GET /og/links/:username.png — share card for a public links page. Fetched without cookies, so it
 * only draws pages the API serves publicly; everything else is a 404.
 */
import type { LinksPage } from '~/types/api'
import { cachedPng, ogPngHeaders } from '../../../utils/og-map-card'
import { fetchAvatarDataUri, renderLinksCardPng } from '../../../utils/og-links-card'

export default defineEventHandler(async (event) => {
  // Failed renders and unavailable pages must not become long-lived broken CDN previews.
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const config = useRuntimeConfig(event)
  const apiBase = (config.apiBaseUrl as string) || 'http://localhost:3001/v1'
  // Nitro/radix includes the suffix in both the parameter name and its value.
  const username = String(getRouterParam(event, 'username.png') ?? '').replace(/\.png$/i, '').trim().toLowerCase()
  if (!/^[a-z0-9_]{1,40}$/.test(username)) throw createError({ statusCode: 404 })

  // Keyed by username only, so a burst of scrapers costs one API call and one render per window.
  const png = await cachedPng(`links:${username}`, 300_000, async () => {
    const page = await $fetch<{ data: LinksPage }>(`${apiBase}/users/${encodeURIComponent(username)}/links`, {
      timeout: 8_000,
      retry: 0,
    })
      .then((r) => r.data)
      .catch((error: { statusCode?: number; status?: number }) => {
        if ([403, 404, 410].includes(error.statusCode ?? error.status ?? 0)) return null
        throw createError({ statusCode: 503, statusMessage: 'Share image temporarily unavailable' })
      })
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
