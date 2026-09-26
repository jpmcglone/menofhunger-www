export type Point = [number, number]
export type Ring = Point[]
export type BBox = { x: number; y: number; width: number; height: number }

/** Full extent of the `@svg-maps/usa.states-territories` artwork. */
export const US_MAP_VIEWBOX: BBox = { x: 8, y: 6, width: 920, height: 585 }

/** States too small to hold a readable label; their labels sit in the right margin. */
export const CALLOUT_STATES = new Set(['RI', 'DE', 'CT', 'NJ', 'MD', 'DC', 'MA', 'VT', 'NH'])

/** Room reserved to the right of the map for callout labels, in map units. */
export const CALLOUT_MARGIN = 70

/** Hand-tuned label anchors where the area centroid reads poorly. Map units. */
export const LABEL_ANCHOR_OVERRIDES: Record<string, Point> = {
  FL: [760, 492],
  CA: [78, 268],
  LA: [540, 440],
  MI: [668, 170],
  KY: [655, 290],
  VA: [762, 282],
  ID: [185, 150],
  OK: [430, 350],
  TX: [392, 440],
}

const TOKEN_RE = /[MmLlHhVvCcSsQqTtZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi

/**
 * Flattens an SVG path into polygon rings. Curves contribute their end points only,
 * which is plenty for bounding boxes, centroids, and hit tests on state outlines.
 */
export function parsePathRings(d: string): Ring[] {
  const tokens = d.match(TOKEN_RE) ?? []
  const rings: Ring[] = []
  let ring: Ring = []
  let cmd = ''
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0
  let i = 0
  const num = () => Number(tokens[i++])
  const closeRing = () => {
    if (ring.length > 2) rings.push(ring)
    ring = []
  }

  while (i < tokens.length) {
    const t = tokens[i]!
    if (/^[a-z]$/i.test(t)) {
      cmd = t
      i++
      if (cmd === 'Z' || cmd === 'z') {
        x = startX
        y = startY
        closeRing()
      }
      continue
    }
    switch (cmd) {
      case 'M':
      case 'm': {
        closeRing()
        const nx = num()
        const ny = num()
        x = cmd === 'm' ? x + nx : nx
        y = cmd === 'm' ? y + ny : ny
        startX = x
        startY = y
        ring.push([x, y])
        cmd = cmd === 'm' ? 'l' : 'L'
        break
      }
      case 'L':
        x = num()
        y = num()
        ring.push([x, y])
        break
      case 'l':
        x += num()
        y += num()
        ring.push([x, y])
        break
      case 'H':
        x = num()
        ring.push([x, y])
        break
      case 'h':
        x += num()
        ring.push([x, y])
        break
      case 'V':
        y = num()
        ring.push([x, y])
        break
      case 'v':
        y += num()
        ring.push([x, y])
        break
      case 'C':
        i += 4
        x = num()
        y = num()
        ring.push([x, y])
        break
      case 'c': {
        i += 4
        x += num()
        y += num()
        ring.push([x, y])
        break
      }
      case 'S':
      case 'Q':
        i += 2
        x = num()
        y = num()
        ring.push([x, y])
        break
      case 's':
      case 'q':
        i += 2
        x += num()
        y += num()
        ring.push([x, y])
        break
      case 'T':
        x = num()
        y = num()
        ring.push([x, y])
        break
      case 't':
        x += num()
        y += num()
        ring.push([x, y])
        break
      default:
        i++
    }
  }
  closeRing()
  return rings
}

export function ringsBBox(rings: Ring[]): BBox {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const ring of rings) {
    for (const [px, py] of ring) {
      if (px < minX) minX = px
      if (py < minY) minY = py
      if (px > maxX) maxX = px
      if (py > maxY) maxY = py
    }
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 0, height: 0 }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function unionBBox(boxes: BBox[]): BBox | null {
  const real = boxes.filter((b) => b.width > 0 || b.height > 0)
  if (!real.length) return null
  const minX = Math.min(...real.map((b) => b.x))
  const minY = Math.min(...real.map((b) => b.y))
  const maxX = Math.max(...real.map((b) => b.x + b.width))
  const maxY = Math.max(...real.map((b) => b.y + b.height))
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * Pads a crop, grows it to a minimum size, and keeps its aspect ratio inside
 * [minAspect, maxAspect] so a single small state never becomes a giant zoom and
 * a single tall state never becomes a narrow strip.
 */
export function fitCrop(
  box: BBox,
  opts: { padRatio?: number; minWidth?: number; minAspect?: number; maxAspect?: number } = {},
): BBox {
  const padRatio = opts.padRatio ?? 0.06
  const minWidth = opts.minWidth ?? US_MAP_VIEWBOX.width * 0.32
  const minAspect = opts.minAspect ?? 1.25
  const maxAspect = opts.maxAspect ?? 1.9
  const pad = Math.max(box.width, box.height) * padRatio
  let width = Math.max(box.width + pad * 2, minWidth)
  let height = box.height + pad * 2
  if (width / height < minAspect) width = height * minAspect
  if (width / height > maxAspect) height = width / maxAspect
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  return { x: cx - width / 2, y: cy - height / 2, width, height }
}

/** Even-odd hit test across every ring of a shape. */
export function pointInRings(px: number, py: number, rings: Ring[]): boolean {
  let inside = false
  for (const ring of rings) {
    for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) {
      const [xi, yi] = ring[a]!
      const [xj, yj] = ring[b]!
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside
    }
  }
  return inside
}

function ringArea(ring: Ring): number {
  let area = 0
  for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) {
    area += ring[b]![0] * ring[a]![1] - ring[a]![0] * ring[b]![1]
  }
  return area / 2
}

/** Area centroid of the largest ring; falls back to the bbox center for degenerate shapes. */
export function ringsCentroid(rings: Ring[]): Point {
  const largest = [...rings].sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)))[0]
  const box = ringsBBox(rings)
  const fallback: Point = [box.x + box.width / 2, box.y + box.height / 2]
  if (!largest) return fallback
  const area = ringArea(largest)
  if (Math.abs(area) < 1e-6) return fallback
  let cx = 0
  let cy = 0
  for (let a = 0, b = largest.length - 1; a < largest.length; b = a++) {
    const [x0, y0] = largest[b]!
    const [x1, y1] = largest[a]!
    const f = x0 * y1 - x1 * y0
    cx += (x0 + x1) * f
    cy += (y0 + y1) * f
  }
  return [cx / (6 * area), cy / (6 * area)]
}

export function labelAnchor(code: string, rings: Ring[]): Point {
  return LABEL_ANCHOR_OVERRIDES[code.toUpperCase()] ?? ringsCentroid(rings)
}

/** 0..1 intensity for a member count, log-scaled so one big state doesn't wash out the rest. */
export function countIntensity(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) return 0
  const t = Math.log(count + 1) / Math.log(maxCount + 1)
  return Math.min(1, Math.max(0, t))
}

/** Theme-aware fill: blends brass into the surface color by member intensity. */
export function stateFill(count: number, maxCount: number): string {
  if (count <= 0) return 'var(--moh-surface-2)'
  const pct = Math.round(22 + countIntensity(count, maxCount) * 78)
  return `color-mix(in srgb, var(--moh-brass) ${pct}%, var(--moh-surface-1))`
}

function hexGrid(rings: Ring[], box: BBox, step: number): Point[] {
  const inset = step * 0.34
  const points: Point[] = []
  const rowStep = step * 0.866
  const probes: Point[] = [[inset, 0], [-inset, 0], [0, inset], [0, -inset]]
  for (let row = 0, py = box.y + rowStep / 2; py <= box.y + box.height; py += rowStep, row++) {
    for (let px = box.x + (row % 2 ? step : step / 2); px <= box.x + box.width; px += step) {
      if (!pointInRings(px, py, rings)) continue
      if (probes.every(([dx, dy]) => pointInRings(px + dx, py + dy, rings))) points.push([px, py])
    }
  }
  return points
}

/**
 * Hex-packs up to `count` avatar centers inside a shape. Returns the largest spacing
 * that still fits everyone, never going below `minStep`; when even `minStep` cannot
 * fit everyone, returns as many points as fit so the caller can show "+N".
 */
export function packAvatars(
  rings: Ring[],
  count: number,
  opts: { minStep: number; maxStep?: number },
): { points: Point[]; step: number } {
  const box = ringsBBox(rings)
  if (count <= 0 || box.width <= 0 || box.height <= 0) return { points: [], step: opts.minStep }
  const maxStep = Math.min(opts.maxStep ?? Infinity, Math.max(box.width, box.height))
  const minStep = Math.min(opts.minStep, maxStep)

  const atMin = hexGrid(rings, box, minStep)
  if (atMin.length <= count) return { points: centerOut(atMin, box), step: minStep }

  let lo = minStep
  let hi = maxStep
  let best = atMin
  let bestStep = minStep
  for (let iter = 0; iter < 18; iter++) {
    const mid = (lo + hi) / 2
    const pts = hexGrid(rings, box, mid)
    if (pts.length >= count) {
      best = pts
      bestStep = mid
      lo = mid
    } else {
      hi = mid
    }
  }
  return { points: centerOut(best, box).slice(0, count), step: bestStep }
}

function centerOut(points: Point[], box: BBox): Point[] {
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  return [...points].sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))
}

export type LabelBox = { id: string; x: number; y: number; width: number; height: number }
export type PlacedLabel = { id: string; x: number; y: number }

function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }, gap: number) {
  return !(
    a.x + a.width / 2 + gap <= b.x - b.width / 2 ||
    b.x + b.width / 2 + gap <= a.x - a.width / 2 ||
    a.y + a.height / 2 + gap <= b.y - b.height / 2 ||
    b.y + b.height / 2 + gap <= a.y - a.height / 2
  )
}

/**
 * Greedy label placement in priority order (callers sort most important first).
 * Each label tries its anchor, then small nudges; a label that still collides is
 * dropped so the map never shows a pile of overlapping pills.
 */
export function placeLabels(labels: LabelBox[], gap = 3): PlacedLabel[] {
  const placed: Array<LabelBox> = []
  for (const label of labels) {
    const dy = label.height + gap
    const dx = label.width / 2 + gap
    const candidates: Point[] = [[0, 0], [0, -dy], [0, dy], [dx, 0], [-dx, 0], [dx, -dy], [-dx, dy]]
    for (const [ox, oy] of candidates) {
      const trial = { ...label, x: label.x + ox, y: label.y + oy }
      if (!placed.some((p) => overlaps(p, trial, gap))) {
        placed.push(trial)
        break
      }
    }
  }
  return placed.map(({ id, x, y }) => ({ id, x, y }))
}

/** Spreads sorted y positions so neighbors are at least `minGap` apart. */
export function spreadVertically(ys: number[], minGap: number): number[] {
  const out: number[] = []
  for (const y of ys) {
    const prev = out[out.length - 1]
    out.push(prev === undefined ? y : Math.max(y, prev + minGap))
  }
  return out
}