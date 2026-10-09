import type { Ref } from 'vue'

/** Onboarding nudge to join a group: hidden once dismissed (cookie) or when membership is unknown. */
export function useHomeGroupsNudge(deps: { isAuthed: Ref<boolean>; isPageAccount: Ref<boolean> }) {
  const { isAuthed, isPageAccount } = deps
  const { load: loadMyGroups } = useMyGroups()
  const groupsNudgeDismissed = useCookie('moh.groups-nudge.dismissed', {
    default: () => '',
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })
  /** null = membership unknown. Never treat the default empty list as “0 groups”. */
  const myGroupsCount = ref<number | null>(null)

  async function refreshMyGroupsCount() {
    if (!isAuthed.value || isPageAccount.value || groupsNudgeDismissed.value) {
      myGroupsCount.value = null
      return
    }
    try {
      const groups = await loadMyGroups()
      if (!isAuthed.value || isPageAccount.value || groupsNudgeDismissed.value) {
        myGroupsCount.value = null
        return
      }
      myGroupsCount.value = groups.length
    } catch {
      myGroupsCount.value = null
    }
  }

  const showGroupsOnboardingNudge = computed(() => {
    if (!isAuthed.value || isPageAccount.value) return false
    if (groupsNudgeDismissed.value) return false
    if (myGroupsCount.value === null) return false
    return myGroupsCount.value === 0
  })

  function dismissGroupsNudge() {
    groupsNudgeDismissed.value = '1'
  }

  return { groupsNudgeDismissed, myGroupsCount, refreshMyGroupsCount, showGroupsOnboardingNudge, dismissGroupsNudge }
}
