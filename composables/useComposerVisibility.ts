import type { PostVisibility } from '~/types/api'

/**
 * Composer visibility state for feed posts.
 *
 * Defaults to 'public'. Remembers the user's last explicit non-onlyMe choice for the
 * browser tab (sessionStorage via useVisibilityMemory('post')): it survives reloads and
 * navigation, clears when the tab closes, and is independent of article and Board audiences.
 * The stored value is applied after mount so server and client render the same markup.
 *
 * Special contexts (check-in, group wall, only-me page) use the lockedVisibility prop
 * on PostComposer and do not interact with this state.
 *
 * 'onlyMe' is intentionally excluded from the remembered default: if the user posts
 * something only-me, the next regular post should still default to their last feed
 * visibility (or 'public' if they haven't posted yet this session).
 */
export function useComposerVisibility() {
  // Primary: the currently active visibility in the composer UI.
  const visibility = useState<PostVisibility>('composer:visibility', () => 'public')
  const memory = useVisibilityMemory('post')

  // Shadow: last non-onlyMe choice. Used by the modal opener so that opening the
  // regular composer after an only-me post doesn't default to 'onlyMe'.
  const feedVisibility = computed<'public' | 'verifiedOnly' | 'premiumOnly'>({
    get: () => memory.visibility.value,
    set: (next) => memory.remember(next),
  })

  const applied = useState<boolean>('composer:visibility:memory-applied', () => false)
  if (import.meta.client && getCurrentInstance()) {
    onMounted(() => {
      if (applied.value) return
      applied.value = true
      const remembered = memory.hydrate()
      if (visibility.value === 'public') visibility.value = remembered
    })
  }

  return { visibility, feedVisibility }
}
