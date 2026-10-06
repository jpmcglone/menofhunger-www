import type { AppHeaderState } from '~/composables/useAppHeader'
import type { CommunityGroupShell } from '~/types/api'

/** Title bar for a single group: its own avatar and description, never the generic directory copy. */
export function groupHeader(group: Pick<CommunityGroupShell, 'name' | 'avatarImageUrl' | 'description' | 'memberCount'>): NonNullable<AppHeaderState> {
  const description = group.description?.trim() || `${group.memberCount.toLocaleString()} ${group.memberCount === 1 ? 'member' : 'members'}`
  return { title: group.name || 'Group', icon: 'tabler:users', group: { name: group.name, avatarUrl: group.avatarImageUrl }, description }
}
