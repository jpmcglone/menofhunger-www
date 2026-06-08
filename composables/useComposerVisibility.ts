import type { PostVisibility } from '~/types/api'

/**
 * In-session composer visibility state.
 *
 * Defaults to 'public' on every fresh page load (hard refresh or new tab resets it).
 * Remembers the user's last explicit non-onlyMe choice for the duration of the browser
 * session so that switching tabs or navigating around the app preserves their preference.
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
  // useState key → shared across all composable callers; resets to 'public' on page reload.
  const visibility = useState<PostVisibility>('composer:visibility', () => 'public')

  // Shadow: last non-onlyMe choice. Used by the modal opener so that opening the
  // regular composer after an only-me post doesn't default to 'onlyMe'.
  const feedVisibility = useState<'public' | 'verifiedOnly' | 'premiumOnly'>(
    'composer:visibility:feed',
    () => 'public',
  )

  return { visibility, feedVisibility }
}
