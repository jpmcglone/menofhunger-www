import { useNotificationsState } from '~/composables/notifications/useNotificationsState'
import { useNotificationDisplay } from '~/composables/notifications/useNotificationDisplay'
import { useNotificationBadges } from '~/composables/notifications/useNotificationBadges'
import { useNotificationsRealtime } from '~/composables/notifications/useNotificationsRealtime'
import { useNotificationsInbox } from '~/composables/notifications/useNotificationsInbox'

/**
 * Seen vs Read semantics:
 * - Unseen = deliveredAt === null (user has not opened the notifications page since it arrived)
 * - Unread = readAt === null (user has not clicked through or marked as read)
 * - New = both null (neither seen nor read)
 * Row highlight and the left bar reflect unread. When read: no bar, no highlight.
 *
 * Public facade: inbox fetch/mutations in useNotificationsInbox, socket merge in
 * useNotificationsRealtime, unread counts in useNotificationBadges, row presentation in
 * useNotificationDisplay. Dependencies are constructed in order and passed through explicit capability types.
 */
export function useNotifications() {
  const c = useNotificationsState()
  const display = useNotificationDisplay(c)
  const badges = useNotificationBadges(c)
  const inbox = useNotificationsInbox({ ...c, normalizeUnreadByKind: badges.normalizeUnreadByKind })
  const realtime = useNotificationsRealtime({
    ...c, fetchList: inbox.fetchList, decrementUnreadKind: badges.decrementUnreadKind,
  })
  const parts = { ...display, ...badges, ...realtime, ...inbox }

  return {
    notifications: c.notifications,
    nextCursor: c.nextCursor,
    loading: c.loading,
    hasFetched: c.hasFetched,
    fetchError: c.fetchError,
    pendingRefresh: c.pendingRefresh,
    activeKind: c.activeKind,
    unreadByKind: c.unreadByKind,
    unreadByCategory: c.unreadByCategory,
    setKind: parts.setKind,
    isNotificationsPage: c.isNotificationsPage,
    fetchList: parts.fetchList,
    markDelivered: parts.markDelivered,
    clearLockScreen: parts.clearLockScreen,
    markBoardNotificationsRead: parts.markBoardNotificationsRead,
    markReadBySubject: parts.markReadBySubject,
    markGroupPostsSeen: parts.markGroupPostsSeen,
    markReadById: parts.markReadById,
    markReadByKind: parts.markReadByKind,
    markAllRead: parts.markAllRead,
    markNewPostsRead: parts.markNewPostsRead,
    clearUnreadKind: parts.clearUnreadKind,
    decrementUnreadKind: parts.decrementUnreadKind,
    applyClearedPostIds: parts.applyClearedPostIds,
    actorDisplay: parts.actorDisplay,
    actorTierClass: parts.actorTierClass,
    actorTierIconBgClass: parts.actorTierIconBgClass,
    notificationTypeIconBgClass: parts.notificationTypeIconBgClass,
    notificationTypeIconTextClass: parts.notificationTypeIconTextClass,
    subjectPostVisibilityTextClass: parts.subjectPostVisibilityTextClass,
    subjectTierRowClass: parts.subjectTierRowClass,
    titleSuffix: parts.titleSuffix,
    notificationTitle: parts.notificationTitle,
    notificationContext: parts.notificationContext,
    isBoostOfStatus: parts.isBoostOfStatus,
    statusBoostText: parts.statusBoostText,
    boostSubjectNoun: parts.boostSubjectNoun,
    notificationIconName: parts.notificationIconName,
    formatWhen: parts.formatWhen,
    formatWhenFull: parts.formatWhenFull,
    rowHref: parts.rowHref,
    groupHref: parts.groupHref,
    itemHref: parts.itemHref,
  }
}
