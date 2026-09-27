/**
 * GET /og/map.png[?state=VA] — still share card for /map. Member counts only.
 * Fetched without the visitor's cookies. Online presence is not drawn here.
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

  const png = await cachedPng(`map:${focus ?? 'all'}`, 900_000, async () => {
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
      states,
      path: '/map',
    })
  })

  ogPngHeaders(event)
  return png
})
