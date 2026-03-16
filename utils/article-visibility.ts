export function articleVisibilityBarClass(visibility: string): string {
  if (visibility === 'premiumOnly') return 'bg-orange-500'
  if (visibility === 'verifiedOnly') return 'bg-blue-500'
  return 'bg-transparent'
}

export function articleVisibilityHoverClass(visibility: string): string {
  if (visibility === 'premiumOnly') return 'hover:bg-orange-50 dark:hover:bg-orange-950/30'
  if (visibility === 'verifiedOnly') return 'hover:bg-blue-50 dark:hover:bg-blue-950/30'
  return 'hover:bg-gray-50 dark:hover:bg-white/5'
}
