export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v && typeof v === 'object')
}
