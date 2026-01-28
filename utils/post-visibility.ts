import type { PostVisibility } from '~/types/api'

export type ProfilePostsFilter = 'all' | 'public' | PostVisibility

export function visibilityTagLabel(v: PostVisibility): string | null {
  if (v === 'verifiedOnly') return 'Verified'
  if (v === 'premiumOnly') return 'Premium'
  return null
}

export function visibilityTagClasses(v: PostVisibility): string {
  if (v === 'verifiedOnly') {
    return 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300'
  }
  if (v === 'premiumOnly') {
    return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
  }
  return ''
}

export function filterPillClasses(kind: ProfilePostsFilter, active: boolean): string {
  if (kind === 'all') {
    // All: inverted
    return active
      ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
      : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-900'
  }

  if (kind === 'public') {
    // Public: regular
    return active
      ? 'border-gray-300 bg-gray-50 text-gray-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-50'
      : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-900'
  }

  if (kind === 'verifiedOnly') {
    // Verified: blue
    return active
      ? 'border-sky-600 bg-sky-600 text-white dark:border-sky-500 dark:bg-sky-500 dark:text-black'
      : 'border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/40'
  }

  // Premium: orange
  return active
    ? 'border-amber-600 bg-amber-600 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-black'
    : 'border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40'
}

