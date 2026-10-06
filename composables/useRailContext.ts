import type { PostDiscoverMoreState } from '~/composables/usePostDiscoverMore'

export type RailContext =
  | { kind: 'post'; id: string; discover: PostDiscoverMoreState }
  | { kind: 'article'; id: string; tag: string | null; authorUsername: string | null; authorName: string | null }
  | { kind: 'board'; id: string; tags: string[] }

type Entry = { owner: symbol; context: RailContext }

/**
 * The detail screen the right rail should recommend from. Detail pages publish a context once
 * their primary content has loaded and withdraw it when they deactivate; the owner token keeps a
 * page that is being replaced from clearing its successor's context.
 */
export function useRailContext() {
  const entry = useState<Entry | null>('moh-rail-context', () => null)
  /** Layout-owned: true while the rail is on screen and showing recommendations (not live chat). */
  const recommendationsDisplayed = useState<boolean>('moh-rail-recommendations-displayed', () => false)

  const context = computed<RailContext | null>(() => entry.value?.context ?? null)

  function publish(owner: symbol, next: RailContext) {
    entry.value = { owner, context: markRaw(next) as RailContext }
  }

  function withdraw(owner: symbol) {
    if (entry.value?.owner === owner) entry.value = null
  }

  return { context, recommendationsDisplayed, publish, withdraw }
}

/** Publishes `build()` while the calling page is active; a null result withdraws the context. */
export function useRailContextPublisher(build: () => RailContext | null) {
  const { publish, withdraw } = useRailContext()
  const owner = Symbol('rail-context')
  const active = ref(import.meta.client)

  const stop = watch(
    [build, active],
    ([next, isActive]) => {
      if (!import.meta.client) return
      if (isActive && next) publish(owner, next)
      else withdraw(owner)
    },
    { immediate: true, flush: 'post' },
  )

  onActivated(() => { active.value = true })
  onDeactivated(() => { active.value = false })
  onBeforeUnmount(() => {
    stop()
    withdraw(owner)
  })
}
