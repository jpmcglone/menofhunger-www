export const SPARKLINE_W = 300
export const SPARKLINE_H = 60
const SPARKLINE_PAD = 4

/** Map samples (oldest→newest) onto the sparkline viewBox. */
export function layoutSparkline(
  samples: Array<{ value: number; at: number }>,
  opts?: { width?: number; height?: number; pad?: number },
): { points: { x: number; y: number }[]; linePath: string; areaPath: string } {
  const width = opts?.width ?? SPARKLINE_W
  const height = opts?.height ?? SPARKLINE_H
  const pad = opts?.pad ?? SPARKLINE_PAD
  if (samples.length < 2) return { points: [], linePath: '', areaPath: '' }
  const values = samples.map((sample) => sample.value)
  const times = samples.map((sample) => sample.at)
  const minV = Math.min(...values)
  const maxV = Math.max(...values)
  const range = maxV - minV || 1
  const minT = Math.min(...times)
  const maxT = Math.max(...times)
  const timeRange = maxT - minT || 1
  const points = samples.map((sample) => ({
    x: pad + ((sample.at - minT) / timeRange) * (width - pad * 2),
    y: (height - pad) - ((sample.value - minV) / range) * (height - pad * 2),
  }))
  const linePath = points
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ')
  const last = points[points.length - 1]!
  const first = points[0]!
  return {
    points,
    linePath,
    areaPath: `${linePath} L ${last.x.toFixed(1)} ${height} L ${first.x.toFixed(1)} ${height} Z`,
  }
}

/** Closest point by x. Used when scrubbing a sparkline. */
export function nearestPointIndex(xs: number[], x: number): number | null {
  if (xs.length === 0) return null
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < xs.length; i++) {
    const dist = Math.abs((xs[i] ?? 0) - x)
    if (dist < bestDist) {
      bestDist = dist
      best = i
    }
  }
  return best
}

/** Day-bar index under a pointer along a row of equal-width columns. */
export function indexAlongWidth(count: number, x: number, width: number): number | null {
  if (count <= 0 || width <= 0) return null
  return Math.min(count - 1, Math.max(0, Math.floor((x / width) * count)))
}
