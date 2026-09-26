import usaMap from '@svg-maps/usa.states-territories'
import { labelAnchor, parsePathRings, ringsBBox, type BBox, type Point, type Ring } from '~/utils/members-map'

export type UsStateShape = {
  /** Uppercase two-letter code, e.g. "VA". */
  code: string
  name: string
  path: string
  rings: Ring[]
  bbox: BBox
  anchor: Point
}

let cache: Map<string, UsStateShape> | null = null

export function usStateShapes(): Map<string, UsStateShape> {
  if (cache) return cache
  cache = new Map()
  for (const loc of usaMap.locations) {
    const code = loc.id.toUpperCase()
    const rings = parsePathRings(loc.path)
    cache.set(code, { code, name: loc.name, path: loc.path, rings, bbox: ringsBBox(rings), anchor: labelAnchor(code, rings) })
  }
  return cache
}

export function usStateShape(code: string | null | undefined): UsStateShape | null {
  if (!code) return null
  return usStateShapes().get(code.toUpperCase()) ?? null
}
