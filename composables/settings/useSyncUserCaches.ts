import type { AuthUser } from '~/composables/useAuth'
import { useUsersStore } from '~/composables/useUsersStore'

/**
 * After a profile/settings save, invalidate every cache that may hold a stale
 * copy of the viewer (user preview, public profile, follow summary) and push
 * the fresh entity into the normalized users store.
 */
export function useSyncUserCaches() {
  const { invalidateUserPreviewCache } = useUserPreview()
  const usersStore = useUsersStore()

  return function syncUserCaches(
    nextUser: AuthUser | null | undefined,
    previousUsername?: string | null,
  ) {
    const prev = (previousUsername ?? '').trim().toLowerCase()
    const next = (nextUser?.username ?? '').trim().toLowerCase()
    if (prev) invalidateUserPreviewCache(prev)
    if (next) invalidateUserPreviewCache(next)
    if (import.meta.client) {
      if (prev) {
        clearNuxtData(`public-profile:${prev}`)
        clearNuxtData(`follow-summary:${prev}`)
      }
      if (next) {
        clearNuxtData(`public-profile:${next}`)
        clearNuxtData(`follow-summary:${next}`)
      }
    }
    if (!nextUser?.id) return
    usersStore.upsert({
      id: nextUser.id,
      username: nextUser.username ?? null,
      name: nextUser.name ?? null,
      bio: nextUser.bio ?? null,
      premium: nextUser.premium,
      premiumPlus: nextUser.premiumPlus,
      verifiedStatus: nextUser.verifiedStatus,
      avatarUrl: nextUser.avatarUrl ?? null,
      bannerUrl: nextUser.bannerUrl ?? null,
      pinnedPostId: nextUser.pinnedPostId ?? null,
    })
  }
}
