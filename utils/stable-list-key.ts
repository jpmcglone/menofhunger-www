function normalizeKeyPart(part: unknown): string {
  if (part === null || part === undefined) return ''
  if (typeof part === 'string' || typeof part === 'number' || typeof part === 'boolean') return String(part)
  try {
    return JSON.stringify(part)
  } catch {
    return String(part)
  }
}

/**
 * Deterministic list key builder for template `:key` usage.
 */
export function stableListKey(...parts: unknown[]): string {
  return parts.map(normalizeKeyPart).join('::')
}

