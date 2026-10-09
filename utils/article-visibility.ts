export function articleVisibilityBarClass(visibility: string): string {
  if (visibility === 'premiumOnly') return 'bg-[var(--moh-premium)]'
  if (visibility === 'verifiedOnly') return 'bg-[var(--moh-verified)]'
  return 'bg-transparent'
}

export function articleVisibilityHoverClass(visibility: string): string {
  if (visibility === 'premiumOnly') return 'hover:bg-[var(--moh-premium-soft)]'
  if (visibility === 'verifiedOnly') return 'hover:bg-[var(--moh-verified-soft)]'
  return 'hover:bg-[var(--moh-surface-hover)]'
}

/** Accent color for an article audience; neutral gray when open to everyone. */
export function articleVisibilityAccent(visibility: string | undefined): string {
  if (visibility === 'premiumOnly') return 'var(--moh-premium)'
  if (visibility === 'verifiedOnly') return 'var(--moh-verified)'
  return '#a1a1aa'
}
