import { describe, expect, it } from 'vitest'
import {
  countIntensity,
  fitCrop,
  packAvatars,
  parsePathRings,
  placeLabels,
  pointInRings,
  ringsBBox,
  ringsCentroid,
  spreadVertically,
  stateFill,
  unionBBox,
  US_MAP_VIEWBOX,
} from '~/utils/members-map'
import { usStateShape, usStateShapes } from '~/utils/us-state-shapes'

const SQUARE = 'M0 0h100v100H0z'

describe('parsePathRings', () => {
  it('handles absolute, relative, and implicit commands', () => {
    const rings = parsePathRings('M10 10l10 0 0 10-10 0zm30 0h5v5h-5z')
    expect(rings).toHaveLength(2)
    expect(rings[0]).toEqual([[10, 10], [20, 10], [20, 20], [10, 20]])
    expect(rings[1]).toEqual([[40, 10], [45, 10], [45, 15], [40, 15]])
  })

  it('uses curve end points and comma-separated numbers', () => {
    const rings = parsePathRings('M0,0 c5,0 10,5 10,10 C20,20 20,20 0,20 s-1,-1 -2,-2z')
    expect(rings[0]).toEqual([[0, 0], [10, 10], [0, 20], [-2, 18]])
  })

  it('produces bounds that match the rendered state artwork', () => {
    const va = usStateShape('va')!
    expect(va.bbox.x).toBeCloseTo(702, 0)
    expect(va.bbox.y).toBeCloseTo(241, -1)
    expect(va.bbox.width).toBeGreaterThan(125)
    expect(va.bbox.width).toBeLessThan(145)
  })

  it('parses every state and territory into a non-empty shape', () => {
    const shapes = [...usStateShapes().values()]
    expect(shapes.length).toBeGreaterThanOrEqual(56)
    for (const s of shapes) {
      expect(s.bbox.width, s.code).toBeGreaterThan(0)
      expect(s.bbox.height, s.code).toBeGreaterThan(0)
    }
  })
})

describe('shape helpers', () => {
  it('computes union bounds and centroids', () => {
    expect(unionBBox([])).toBeNull()
    expect(unionBBox([{ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 5, width: 5, height: 20 }])).toEqual({ x: 0, y: 0, width: 25, height: 25 })
    const [cx, cy] = ringsCentroid(parsePathRings(SQUARE))
    expect(cx).toBeCloseTo(50)
    expect(cy).toBeCloseTo(50)
  })

  it('hit-tests with the even-odd rule', () => {
    const rings = parsePathRings(SQUARE)
    expect(pointInRings(50, 50, rings)).toBe(true)
    expect(pointInRings(150, 50, rings)).toBe(false)
  })

  it('keeps each label anchor inside its state', () => {
    for (const s of usStateShapes().values()) {
      expect(pointInRings(s.anchor[0], s.anchor[1], s.rings), s.code).toBe(true)
    }
  })
})

describe('fitCrop', () => {
  it('grows a single tiny state to the minimum crop instead of zooming in on it', () => {
    const ri = usStateShape('RI')!
    const crop = fitCrop(ri.bbox)
    expect(crop.width).toBeGreaterThanOrEqual(US_MAP_VIEWBOX.width * 0.32 - 0.01)
    expect(crop.width / crop.height).toBeLessThanOrEqual(1.9 + 1e-9)
    expect(crop.x).toBeLessThan(ri.bbox.x)
    expect(crop.x + crop.width).toBeGreaterThan(ri.bbox.x + ri.bbox.width)
  })

  it('widens tall crops to the minimum aspect ratio', () => {
    const crop = fitCrop({ x: 0, y: 0, width: 100, height: 400 })
    expect(crop.width / crop.height).toBeCloseTo(1.25)
  })
})

describe('countIntensity and stateFill', () => {
  it('log-scales member counts', () => {
    expect(countIntensity(0, 50)).toBe(0)
    expect(countIntensity(50, 50)).toBe(1)
    expect(countIntensity(5, 50)).toBeGreaterThan(0.4)
    expect(stateFill(0, 10)).toBe('var(--moh-surface-2)')
    expect(stateFill(10, 10)).toContain('100%')
  })
})

describe('packAvatars', () => {
  const rings = parsePathRings(SQUARE)

  it('fits exactly the requested count with the largest spacing', () => {
    const { points, step } = packAvatars(rings, 12, { minStep: 5 })
    expect(points).toHaveLength(12)
    expect(step).toBeGreaterThan(20)
    for (const [x, y] of points) expect(pointInRings(x, y, rings)).toBe(true)
  })

  it('caps at what fits the minimum spacing so the caller can show overflow', () => {
    const { points, step } = packAvatars(rings, 10_000, { minStep: 20 })
    expect(step).toBe(20)
    expect(points.length).toBeGreaterThan(10)
    expect(points.length).toBeLessThan(40)
  })

  it('packs inside a real state outline', () => {
    const va = usStateShape('VA')!
    const { points } = packAvatars(va.rings, 34, { minStep: 3 })
    expect(points).toHaveLength(34)
  })
})

describe('placeLabels and spreadVertically', () => {
  it('nudges or drops colliding labels in priority order', () => {
    const box = { width: 40, height: 20 }
    const labels = Array.from({ length: 12 }, (_, i) => ({ id: String(i), x: 0, y: 0, ...box }))
    const placed = placeLabels(labels)
    expect(placed[0]).toEqual({ id: '0', x: 0, y: 0 })
    expect(placed[1]).not.toEqual({ id: '1', x: 0, y: 0 })
    expect(placed.length).toBeLessThan(labels.length)
    for (const a of placed) {
      for (const b of placed) {
        if (a === b) continue
        const apart = Math.abs(a.x - b.x) >= box.width || Math.abs(a.y - b.y) >= box.height
        expect(apart, `${a.id} vs ${b.id}`).toBe(true)
      }
    }
  })

  it('spreads callouts apart', () => {
    expect(spreadVertically([10, 12, 40], 20)).toEqual([10, 30, 50])
  })

  it('computes bounds for an empty ring list', () => {
    expect(ringsBBox([])).toEqual({ x: 0, y: 0, width: 0, height: 0 })
  })
})
