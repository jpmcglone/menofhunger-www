/**
 * GET /og/online.png — live share card for /online: how many men are online and where.
 * Fetched without cookies, so it is counts only.
 */
import type { MembersMapSummary } from '~/types/api'
import type { OnlinePaginationDto } from '~/types/api-contracts.gen'
import { cachedPng, ogPngHeaders, renderMapCardPng } from '../../utils/og-map-card'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiBase = (config.apiBaseUrl as string) || 'http://localhost:3001/v1'

  const png = await cachedPng('online', 60_000, async () => {
    const [presence, map] = await Promise.all([
      $fetch<{ pagination?: OnlinePaginationDto }>(`${apiBase}/presence/online`, { query: { summary: '1' } }).catch(() => null),
      $fetch<{ data: MembersMapSummary }>(`${apiBase}/users/map`).catch(() => null),
    ])
    const online = presence?.pagination?.totalOnline ?? map?.data.totals.online ?? 0
    const guests = presence?.pagination?.anonymousOnline ?? 0
    const members = map?.data.totals.members ?? 0
    const byOnline = (map?.data.states ?? []).map((s) => ({ state: s.state, count: s.onlineCount }))
    // With nobody online in a known state, shade by membership so the map still reads.
    const states = byOnline.some((s) => s.count > 0)
      ? byOnline
      : (map?.data.states ?? []).map((s) => ({ state: s.state, count: s.memberCount }))

    return renderMapCardPng({
      eyebrow: 'Online now',
      headline: online.toLocaleString('en-US'),
      headlineRest: online === 1 ? 'man online right now' : 'men online right now',
      onlineLabel:
        guests > 0
          ? `+${guests.toLocaleString('en-US')} ${guests === 1 ? 'guest' : 'guests'} browsing`
          : `of ${members.toLocaleString('en-US')} members`,
      states,
      path: '/online',
    })
  })

  ogPngHeaders(event)
  return png
})
