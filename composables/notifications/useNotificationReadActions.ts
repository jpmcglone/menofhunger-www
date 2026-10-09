import type { Ref } from 'vue'
import type { NotificationFeedItem, NotificationKind } from '~/types/api'
import { isInteractiveTarget } from '~/utils/interactive-target'
import { closeBrowserNotificationsForHref } from '~/utils/browser-notifications'

type FeedItem = NotificationFeedItem

/** Optimistic read marking and open/click navigation for notification rows. */
export function useNotificationReadActions(deps: {
  notifications: Ref<FeedItem[]>
  viewer: ReturnType<typeof useAuth>['user']
  inbox: Pick<ReturnType<typeof useNotifications>, 'markReadById' | 'decrementUnreadKind' | 'fetchList' | 'itemHref'>
  badge: ReturnType<typeof useNotificationsBadge>
  toast: ReturnType<typeof useAppToast>
}) {
  const { notifications, viewer: notificationViewer, badge: notifBadge, toast: notificationReadToast } = deps
  const { markReadById, decrementUnreadKind, fetchList, itemHref } = deps.inbox

  /**
   * Optimistically mark a feed item as read+seen in local state and on the server.
   * Used when the user opens a notification (including new-tab opens) so the row
   * updates read counts immediately, instead of waiting for the destination
   * page to fire markReadBySubject + the websocket to round-trip.
   *
   * Groups/rollups carry a representative id; markReadById on that id won't clear
   * every underlying notification — but the row's visible "unread" styling reads
   * off the group/rollup's own readAt, which we update locally. The destination
   * page's `markReadBySubject` will then clear the rest server-side.
   */
  function markItemReadOptimistic(item: FeedItem) {
    const now = new Date().toISOString()
    let id: string | null = null
    let unreadKind: NotificationKind | null = null
    let changed = false
    notifications.value = notifications.value.map((curr) => {
      if (curr.type === 'single') {
        if (item.type !== 'single' || curr.notification.id !== item.notification.id) return curr
        id = curr.notification.id
        if (curr.notification.readAt) return curr
        unreadKind = curr.notification.kind
        changed = true
        return {
          ...curr,
          notification: {
            ...curr.notification,
            readAt: now,
            deliveredAt: curr.notification.deliveredAt ?? now,
          },
        }
      }
      if (curr.type === 'group') {
        if (item.type !== 'group' || curr.group.id !== item.group.id) return curr
        id = curr.group.id
        if (curr.group.readAt) return curr
        unreadKind = curr.group.kind
        changed = true
        return {
          ...curr,
          group: { ...curr.group, readAt: now, deliveredAt: curr.group.deliveredAt ?? now },
        }
      }
      if (item.type !== 'followed_posts_rollup' || curr.rollup.id !== item.rollup.id) return curr
      if (curr.rollup.readAt) return curr
      unreadKind = 'followed_post'
      changed = true
      return {
        ...curr,
        rollup: { ...curr.rollup, readAt: now, deliveredAt: curr.rollup.deliveredAt ?? now },
      }
    })
    if (changed) decrementUnreadKind(unreadKind)
    if (id) {
      const account = notificationViewer.value?.id
      void markReadById(id).then(() => {
        if (account === notificationViewer.value?.id) void notifBadge.fetchUndeliveredCount()
      }).catch(() => {
        if (account !== notificationViewer.value?.id) return
        notificationReadToast.push({ title: 'Couldn’t mark notification read. Try again.', tone: 'error' })
        void fetchList({ forceRefresh: true })
      })
    }
    closeBrowserNotificationsForHref(itemHref(item))
  }

  function onNotificationClick(item: FeedItem, e: MouseEvent) {
    const href = itemHref(item)
    if (!href) return
    if (isInteractiveTarget(e.target, 'notification')) return
    if (e.metaKey || e.ctrlKey) {
      markItemReadOptimistic(item)
      window.open(href, '_blank')
      return
    }
    markItemReadOptimistic(item)
    void navigateTo(href)
  }

  function onNotificationAuxClick(item: FeedItem, e: MouseEvent) {
    if (e.button !== 1) return
    const href = itemHref(item)
    if (!href) return
    if (isInteractiveTarget(e.target, 'notification')) return
    e.preventDefault()
    markItemReadOptimistic(item)
    window.open(href, '_blank')
  }

  function onNotificationKeydown(item: FeedItem) {
    const href = itemHref(item)
    if (!href) return
    markItemReadOptimistic(item)
    void navigateTo(href)
  }

  return { markItemReadOptimistic, onNotificationClick, onNotificationAuxClick, onNotificationKeydown }
}
