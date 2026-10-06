import { userColorTier } from '~/utils/user-tier'

/** Activity belongs to the acting identity, including aggregated operated-page badges. */
export function useActivityBadgeTone() {
  const { user } = useAuth()
  return computed(() => `moh-notif-badge-${userColorTier(user.value)}`)
}
