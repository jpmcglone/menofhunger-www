/**
 * GET /og/map.png[?state=VA] — live share card for /map. Fetched without the visitor's
 * cookies, so it only ever shows counts (the public, counts-only summary).
 */
import type { MembersMapSummary } from '~/types/api'
import { usStateShape } from '~/utils/us-state-shapes'
import { cachedPng, ogPngHeaders, renderMapCardPng } from '../../utils/og-map-card'

const men = (n: number) => (n === 1 ? 'man' : 'men')

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const apiBase = (config.apiBaseUrl as string) || 'http://localhost:3001/v1'
  const rawState = String(getQuery(event).state ?? '').trim().toUpperCase()
  const focus = /^[A-Z]{2}$/.test(rawState) && usStateShape(rawState) ? rawState : null

  const png = await cachedPng(`map:${focus ?? 'all'}`, 120_000, async () => {
    const res = await $fetch<{ data: MembersMapSummary }>(`${apiBase}/users/map`).catch(() => null)
    const summary = res?.data
    const states = (summary?.states ?? []).map((s) => ({ state: s.state, count: s.memberCount }))

    if (focus) {
      const row = summary?.states.find((s) => s.state === focus)
      const count = row?.memberCount ?? 0
      return renderMapCardPng({
        eyebrow: 'Member map',
        headline: count.toLocaleString('en-US'),
        headlineRest: `${men(count)} in ${row?.stateDisplay ?? usStateShape(focus)?.name ?? focus}`,
        onlineLabel: `${(row?.onlineCount ?? 0).toLocaleString('en-US')} online right now`,
        states,
        focusState: focus,
        path: `/map?state=${focus}`,
      })
    }

    const members = summary?.totals.members ?? 0
    const stateCount = summary?.totals.states ?? 0
    return renderMapCardPng({
      eyebrow: 'Member map',
      headline: members.toLocaleString('en-US'),
      headlineRest: `${men(members)} across ${stateCount} ${stateCount === 1 ? 'state' : 'states'}`,
      onlineLabel: `${(summary?.totals.online ?? 0).toLocaleString('en-US')} online right now`,
      states,
      path: '/map',
    })
  })

  ogPngHeaders(event)
  return png
})
