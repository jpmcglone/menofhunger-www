const CAP = 99

/**
 * One definition of "how much needs me" for the tab title, app icon, profile
 * bar, and account menu. Counts are summed across the acting identity and the other
 * identities in the operator cluster. Dots never add to the total; they only decide
 * whether an empty total still shows a dot ((*) in the tab title).
 */
export function useAttentionTotals() {
  const { user } = useAuth()
  const { notificationUndeliveredCount, messageUnreadCounts, groupsUnread, hasUnreadNotifications, notificationNavUnread } = usePresence()
  const { count: pendingGroupInviteCount } = useGroupInvitesBadge()
  const { accounts, otherAccountsUnread, otherAccountsHaveUnread } = useAccountSwitcher()

  const currentCount = computed(() => {
    if (!user.value?.id) return 0
    const current = accounts.value.find(account => account.id === user.value?.id)
    if (current) return Math.max(0, Math.floor(current.unreadBadgeCount) || 0)
    const n = (v: unknown) => Math.max(0, Math.floor(Number(v)) || 0)
    return n(notificationUndeliveredCount.value)
      + n(groupsUnread.value.total)
      + n(pendingGroupInviteCount.value)
      + n(messageUnreadCounts.value.primary)
      + n(messageUnreadCounts.value.requests)
      + n(notificationNavUnread.value.boardMentions)
  })

  const currentHasDot = computed(() => Boolean(hasUnreadNotifications.value) || (notificationNavUnread.value.board ?? 0) > 0)
  const othersCount = computed(() => Math.max(0, Math.floor(otherAccountsUnread.value) || 0))
  const othersHaveDot = computed(() => Boolean(otherAccountsHaveUnread.value))
  const totalCount = computed(() => (user.value?.id ? currentCount.value + othersCount.value : 0))
  const hasAnyDot = computed(() => Boolean(user.value?.id) && (currentHasDot.value || othersHaveDot.value))
  const cappedTotal = computed(() => Math.min(totalCount.value, CAP))
  const totalLabel = computed(() => (totalCount.value > CAP ? `${CAP}+` : String(totalCount.value)))

  return { currentCount, currentHasDot, othersCount, othersHaveDot, totalCount, cappedTotal, totalLabel, hasAnyDot }
}
