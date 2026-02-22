import type { FeedPost } from '~/types/api'

type RegisteredPost = {
  id: string
  post: FeedPost
}

type FocusSource = 'keyboard' | 'mouse'

// Module-level singletons (mutated client-side only; safe in Nuxt SSR since
// onMounted/onBeforeUnmount never execute on the server).
const orderedPosts: RegisteredPost[] = []

export function useKeyboardShortcutsFocusedPost() {
  const focusedPostId = useState<string | null>('moh.shortcuts.focusedPostId', () => null)
  const focusSource = useState<FocusSource | null>('moh.shortcuts.focusSource', () => null)

  const { show: showReply } = useReplyModal()

  function registerPost(post: FeedPost) {
    if (orderedPosts.some((p) => p.id === post.id)) return
    orderedPosts.push({ id: post.id, post })
  }

  function unregisterPost(id: string) {
    const idx = orderedPosts.findIndex((p) => p.id === id)
    if (idx >= 0) orderedPosts.splice(idx, 1)
    if (focusedPostId.value === id) {
      focusedPostId.value = null
      focusSource.value = null
    }
  }

  function setFocusedPost(id: string | null, source: FocusSource = 'mouse') {
    focusedPostId.value = id
    focusSource.value = id ? source : null
  }

  function clearFocus() {
    focusedPostId.value = null
    focusSource.value = null
  }

  function scrollFocusedIntoView() {
    const id = focusedPostId.value
    if (!id || !import.meta.client) return
    const el = document.querySelector(`[data-post-id="${CSS.escape(id)}"]`)
    if (!el) return
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  function focusNext() {
    if (orderedPosts.length === 0) return
    const currentIdx = orderedPosts.findIndex((p) => p.id === focusedPostId.value)
    const nextIdx = currentIdx < 0 ? 0 : Math.min(currentIdx + 1, orderedPosts.length - 1)
    const nextId = orderedPosts[nextIdx]?.id ?? null
    focusedPostId.value = nextId
    focusSource.value = nextId ? 'keyboard' : null
    nextTick(() => scrollFocusedIntoView())
  }

  function focusPrev() {
    if (orderedPosts.length === 0) return
    const currentIdx = orderedPosts.findIndex((p) => p.id === focusedPostId.value)
    const prevIdx = currentIdx <= 0 ? 0 : currentIdx - 1
    const prevId = orderedPosts[prevIdx]?.id ?? null
    focusedPostId.value = prevId
    focusSource.value = prevId ? 'keyboard' : null
    nextTick(() => scrollFocusedIntoView())
  }

  function replyToFocused() {
    const id = focusedPostId.value
    if (!id) return
    const entry = orderedPosts.find((p) => p.id === id)
    if (!entry?.post) return
    showReply(entry.post)
  }

  return {
    focusedPostId,
    focusSource,
    registerPost,
    unregisterPost,
    setFocusedPost,
    clearFocus,
    focusNext,
    focusPrev,
    replyToFocused,
  }
}
