import type { FeedPost } from '~/types/api'

/** Marv "Catch me up" button state for a post row. */
export function usePostRowCatchUp(postView: ComputedRef<FeedPost>) {
  // Marv "Catch me up": offered to every signed-in viewer on every real post row. Marv
  // summarizes the post itself plus any thread above/below it, and can pull in broader
  // context (web search / current events) so it's useful even on a lone post. Opening the
  // modal is free; generating a summary spends credits (gated server-side; non-premium
  // sees an upsell).
  const { show: showCatchUp, post: catchUpPost, result: catchUpResult } = useMarvCatchUp()
  // In-session signal: this post's summary is already loaded in global state.
  const catchUpSessionReady = computed(
    () => catchUpPost.value?.id === postView.value.id && !!catchUpResult.value,
  )
  // Persisted signal: we saw a summary for this post recently enough that the server cache
  // should still have it. The initial read is deferred to onMounted because localStorage is
  // client-only and reading it during setup would render a different icon class than SSR
  // emitted. The watcher covers this row being recycled for a different post while scrolling.
  const catchUpPersistedReady = ref(false)
  onMounted(() => {
    catchUpPersistedReady.value = isPostCaughtUp(postView.value.id)
  })
  watch(
    () => postView.value.id,
    (id) => {
      catchUpPersistedReady.value = isPostCaughtUp(id)
    },
  )
  // Combined: high-contrast icon when a result is either in-session or should still be cached.
  watch(catchUpSessionReady, (ready) => {
    if (ready) catchUpPersistedReady.value = true
  })
  const catchUpResultReady = computed(() => catchUpSessionReady.value || catchUpPersistedReady.value)
  function onCatchMeUp() {
    showCatchUp(postView.value)
  }

  return { catchUpResultReady, onCatchMeUp }
}
