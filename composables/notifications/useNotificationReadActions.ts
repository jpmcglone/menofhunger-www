import { useNotificationReadMutation } from './useNotificationReadMutation'
import type { NotificationFeedItem } from '~/types/api'
import { isInteractiveTarget } from '~/utils/interactive-target'
import { closeBrowserNotificationsForHref } from '~/utils/browser-notifications'

type FeedItem = NotificationFeedItem

/** Optimistic read marking and open/click navigation for notification rows. */
export function useNotificationReadActions(deps: {
  itemHref: (item: FeedItem) => string | null
}) {
  const { itemHref } = deps
  const { markRead } = useNotificationReadMutation()

  function markItemReadOptimistic(item: FeedItem) {
    void markRead(item)
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
