import type { FollowRelationship, UserNotificationPreference } from '~/types/api'

export function userNotificationPreference(relationship?: FollowRelationship | null): UserNotificationPreference {
  if (!relationship?.viewerFollowsUser) return 'off'
  return relationship.viewerNotificationPreference ?? (relationship.viewerPostNotificationsEnabled ? 'all' : 'posts')
}

export const userNotificationOptions: { value: UserNotificationPreference; label: string; description: string; icon: string }[] = [
  { value: 'all', label: 'All activity', description: 'Posts, articles and replies', icon: 'tabler:bell' },
  { value: 'posts', label: 'Posts and articles', description: 'New posts and published articles', icon: 'tabler:article' },
  { value: 'off', label: 'Off', description: 'No post or article alerts', icon: 'tabler:x' },
]
