import type { Notification, NotificationCategory, NotificationKind } from '~/types/api'

export function notificationCategory(n: Pick<Notification, 'kind' | 'category' | 'post'>): NotificationCategory {
  if (n.category) return n.category
  switch (n.kind) {
    case 'followed_post': return n.post?.parentId ? 'replies' : 'posts'
    case 'checkin_post':
    case 'community_group_post': return 'posts'
    case 'comment': return 'replies'
    case 'mention':
    case 'crew_wall_mention': return 'mentions'
    case 'status_update': return 'statuses'
    case 'follow': return 'follows'
    case 'boost': return 'boosts'
    default: return 'other'
  }
}

export function notificationFilterCategory(kind: NotificationKind | 'other' | null): NotificationCategory | 'all' {
  if (!kind) return 'all'
  return notificationCategory({ kind: kind as NotificationKind })
}
