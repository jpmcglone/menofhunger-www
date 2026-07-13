export function useHomeLoadState() {
  const initialFeedResolved = useState<boolean>('home-load:initial-feed-resolved', () => false)

  function reset() {
    initialFeedResolved.value = false
  }

  function markInitialFeedResolved() {
    initialFeedResolved.value = true
  }

  return {
    initialFeedResolved: readonly(initialFeedResolved),
    reset,
    markInitialFeedResolved,
  }
}
