import { useMediaQuery } from '@vueuse/core'

/**
 * Hydration-safe media query.
 * Keeps SSR + first client render deterministic by returning `fallback` until app mounted.
 */
export function useHydratedMediaQuery(query: string, fallback = false) {
  const hydrated = useState<boolean>('moh-hydrated', () => false)
  const matches = useMediaQuery(query)
  return computed(() => (hydrated.value ? matches.value : fallback))
}

