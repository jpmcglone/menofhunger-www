import type { ComputedRef, Ref } from 'vue'
import type { PostVisibility } from '~/types/api'
import type { GroupComposerContext } from '~/utils/injection-keys'

/** Composer modal border and Post button (FAB + left nav) presentation, keyed to composer scope. */
export function useComposerEntrypointStyle(deps: {
  isGroupPage: ComputedRef<boolean>
  isOnlyMePage: ComputedRef<boolean>
  groupComposerCtx: Ref<GroupComposerContext | null>
  composerLockedVisibility: ComputedRef<PostVisibility | null>
  composerVisibility: Ref<PostVisibility>
  composerNonOnlyMeVisibility: Ref<PostVisibility | null | undefined>
}) {
  const { isGroupPage, isOnlyMePage, groupComposerCtx, composerLockedVisibility, composerVisibility, composerNonOnlyMeVisibility } = deps
  const { isVerified: viewerIsVerified } = useAuth()

  const composerModalBorderClass = computed(() => {
    if (isGroupPage.value && groupComposerCtx.value) return 'border-[color:var(--moh-group)]'
    const v = composerLockedVisibility.value ?? (
      composerVisibility.value === 'onlyMe' && !isOnlyMePage.value
        ? (composerNonOnlyMeVisibility.value ?? 'public')
        : composerVisibility.value
    )
    if (v === 'verifiedOnly') return 'moh-thread-verified'
    if (v === 'premiumOnly') return 'moh-thread-premium'
    if (v === 'onlyMe') return 'moh-thread-onlyme'
    return 'border-gray-200 dark:border-zinc-800'
  })

  // Post button (FAB + left nav): color matches composer scope. Public = black/white (light) or white/black (dark).
  const { destination: shareDestination } = useShareDestination()
  const fabTargetsGroup = computed(() => Boolean(isGroupPage.value && groupComposerCtx.value) || (
    !isOnlyMePage.value && viewerIsVerified.value && shareDestination.value.kind === 'group'
  ))
  const fabButtonClass = computed(() => {
    if (fabTargetsGroup.value) return 'moh-btn-tone'
    // On /only-me, always present the "Only me" purple button and default the composer to onlyMe.
    // (We don't permanently change the cookie just by visiting the page.)
    if (isOnlyMePage.value || !viewerIsVerified.value) return 'moh-btn-onlyme moh-btn-tone'
    const v = composerVisibility.value === 'onlyMe'
      ? (composerNonOnlyMeVisibility.value ?? 'public')
      : composerVisibility.value
    // Use .moh-btn-scope for verified/premium: its background reads --moh-scope-bg which
    // is updated synchronously by useComposerScopeTint (via Unhead), so the button color
    // snaps in the same CSS-cascade tick as the composer tint rather than waiting for
    // Vue's async render flush.
    if (v === 'verifiedOnly' || v === 'premiumOnly') return 'moh-btn-scope moh-btn-tone'
    return 'bg-black text-white dark:bg-white dark:text-black'
  })
  const fabButtonStyle = computed(() => {
    if (fabTargetsGroup.value) {
      return { backgroundColor: 'var(--moh-group)', color: '#fff' }
    }
    return {}
  })

  return { composerModalBorderClass, fabButtonClass, fabButtonStyle }
}
