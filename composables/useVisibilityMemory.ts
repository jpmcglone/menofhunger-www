export type VisibilitySurface = 'post' | 'article' | 'board'
export type RememberedVisibility = 'public' | 'verifiedOnly' | 'premiumOnly'

const VALUES: RememberedVisibility[] = ['public', 'verifiedOnly', 'premiumOnly']
const storageKey = (surface: VisibilitySurface) => `moh:visibility:${surface}`

/**
 * Last audience per surface (posts, articles, Board threads), independent of each other.
 * Lives for the browser tab (sessionStorage): survives reloads, clears when the tab closes,
 * and defaults to public. Read only on the client after mount to keep SSR output stable.
 */
export function useVisibilityMemory(surface: VisibilitySurface) {
  const visibility = useState<RememberedVisibility>(`visibility-memory:${surface}`, () => 'public')
  const hydrated = useState<boolean>(`visibility-memory-hydrated:${surface}`, () => false)

  function hydrate(): RememberedVisibility {
    if (import.meta.client && !hydrated.value) {
      hydrated.value = true
      try {
        const stored = window.sessionStorage.getItem(storageKey(surface)) as RememberedVisibility | null
        if (stored && VALUES.includes(stored)) visibility.value = stored
      } catch {
        // Storage can be unavailable (private mode); fall back to in-memory state.
      }
    }
    return visibility.value
  }

  function remember(next: string) {
    if (!VALUES.includes(next as RememberedVisibility)) return
    visibility.value = next as RememberedVisibility
    if (!import.meta.client) return
    try {
      window.sessionStorage.setItem(storageKey(surface), next)
    } catch {
      // ignore
    }
  }

  return { visibility, hydrate, remember }
}
