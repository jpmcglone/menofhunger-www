/**
 * Who may see *which* members are online or where they live. Everyone else sees counts.
 * Mirrors the API's canSeeMembers (verified, Premium, or admin). Derived from the auth user,
 * which is SSR-hydrated, so server and client agree on the first render.
 */
export function useMembersAccess() {
  const route = useRoute()
  const { user, isVerified, isPremium } = useAuth()

  const membersVisible = computed(() => Boolean(user.value?.id) && (isVerified.value || isPremium.value || Boolean(user.value?.siteAdmin)))

  const unlock = computed(() => {
    if (!user.value?.id) {
      return {
        label: 'Sign in to see who',
        to: `/login?redirect=${encodeURIComponent(route.fullPath)}`,
        body: 'Men of Hunger members can see exactly who is here.',
      }
    }
    return {
      label: 'Verify to see who',
      to: '/settings/verification',
      body: 'Verified members can see exactly who is here.',
    }
  })

  return { membersVisible, unlock }
}
