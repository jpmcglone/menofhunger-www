import type { CommunityGroupShell } from '~/types/api'

/** The group whose Posts / Channels tab bar the app layout keeps mounted across both pages. */
export function useGroupTabs() {
  return useState<{ group: CommunityGroupShell; personalCount?: number } | null>('group-tabs', () => null)
}
