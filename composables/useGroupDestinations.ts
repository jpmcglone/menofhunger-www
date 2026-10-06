import type { CommunityGroupShell } from '~/types/api'

export function useGroupDestinations() {
  const { user } = useAuth()
  const remembered = useState<Record<string, string>>('group-destinations', () => ({}))
  const identity = useState<string | null>('group-destination-identity', () => null)
  function key(group: Pick<CommunityGroupShell, 'id'>) { return `${user.value?.id ?? ''}:${group.id}` }
  function remember(group: CommunityGroupShell, path: string) {
    if (identity.value !== user.value?.id) { remembered.value = {}; identity.value = user.value?.id ?? null }
    remembered.value[key(group)] = path
  }
  function lastDestination(group: CommunityGroupShell) {
    const path = remembered.value[key(group)]
    const posts = `/g/${encodeURIComponent(group.slug)}`
    if (!group.channelsAvailable) return posts
    return path ?? `/groups/${encodeURIComponent(group.slug)}/channels`
  }
  return { remember, lastDestination }
}
