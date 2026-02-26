import type { PostVisibility } from '~/types/api'

/**
 * Injects global CSS variables `--moh-scope-bg` and `--moh-scope-text` onto <html>
 * that mirror the active composer visibility. Because useHead runs its reactive
 * update synchronously (via Unhead's sync watcher), these CSS vars update at the
 * same instant as the PostComposer's own tint style — before Vue's async render
 * flush fires. Any element using `.moh-btn-scope` therefore snaps to the new color
 * with zero lag, avoiding the one-or-more frame delay that class-binding-based
 * color switches suffer from.
 *
 * Call this once from app.vue (the layout) so it is always active.
 */
export function useComposerScopeTint() {
  const visibility = useCookie<PostVisibility>('moh.post.visibility.v1', {
    default: () => 'public',
    sameSite: 'lax',
    path: '/',
  })

  useHead({
    style: [
      {
        key: 'moh-scope-tint',
        textContent: () => {
          const v = visibility.value
          // Premium gets its own accent; everything else (verified, public, onlyMe)
          // falls back to the verified blue so the check-in and Post buttons always
          // have a valid color even when the composerVisibility isn't explicitly scoped.
          if (v === 'premiumOnly') {
            return 'html{--moh-scope-bg:var(--moh-premium);--moh-scope-text:#fff}'
          }
          if (v === 'onlyMe') {
            return 'html{--moh-scope-bg:var(--moh-onlyme);--moh-scope-text:#fff}'
          }
          return 'html{--moh-scope-bg:var(--moh-verified);--moh-scope-text:#fff}'
        },
      },
    ],
  })
}
