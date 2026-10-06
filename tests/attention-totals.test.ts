import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const accounts = ref<any[]>([])
const hasUnreadNotifications = ref(false)
const nav = ref({ board: 0, boardMentions: 0, articles: 0 })
mockNuxtImport('useAuth', () => () => ({ user: ref({ id: 'me' }) }))
mockNuxtImport('useGroupInvitesBadge', () => () => ({ count: ref(0) }))
mockNuxtImport('useAccountSwitcher', () => () => ({
  accounts,
  otherAccountsUnread: computed(() => accounts.value.filter(a => !a.isCurrent).reduce((s, a) => s + a.unreadBadgeCount, 0)),
  otherAccountsHaveUnread: computed(() => accounts.value.some(a => !a.isCurrent && (a.hasUnreadNotifications || a.hasUnreadBoard))),
}))
mockNuxtImport('usePresence', () => () => ({
  notificationUndeliveredCount: ref(0),
  messageUnreadCounts: ref({ primary: 0, requests: 0 }),
  groupsUnread: ref({ total: 0, byGroupId: {} }),
  hasUnreadNotifications,
  notificationNavUnread: nav,
}))

describe('useAttentionTotals', () => {
  it('sums counts across identities and ignores dots', () => {
    accounts.value = [
      { id: 'me', isCurrent: true, unreadBadgeCount: 2 },
      { id: 'page', isCurrent: false, unreadBadgeCount: 3, hasUnreadBoard: true },
    ]
    hasUnreadNotifications.value = true
    const totals = useAttentionTotals()
    expect(totals.totalCount.value).toBe(5)
    expect(totals.hasAnyDot.value).toBe(true)
  })

  it('is dot-only when counts are zero but Board or other pages have activity', () => {
    accounts.value = [
      { id: 'me', isCurrent: true, unreadBadgeCount: 0 },
      { id: 'page', isCurrent: false, unreadBadgeCount: 0, hasUnreadBoard: true },
    ]
    hasUnreadNotifications.value = false
    const totals = useAttentionTotals()
    expect(totals.totalCount.value).toBe(0)
    expect(totals.hasAnyDot.value).toBe(true)
  })
})
