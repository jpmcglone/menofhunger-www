/**
 * Shared recent-searches state.
 *
 * Both the right-rail input (layouts/app.vue) and the Explore sticky bar
 * (pages/explore.vue) mount simultaneously on desktop. Keeping the list in
 * useState ensures they never disagree within the same tab.
 */
import type { RecentSearch, FollowListUser, RecentSearchGroup, CommunityGroupShell } from '~/types/api'

const STATE_KEY = 'moh.recentSearches'

export function useRecentSearches() {
  const { apiFetch } = useApiClient()
  const { isAuthed } = useAuth()

  const recents = useState<RecentSearch[]>(STATE_KEY, () => [])
  const loaded = useState<boolean>(`${STATE_KEY}.loaded`, () => false)
  const loading = useState<boolean>(`${STATE_KEY}.loading`, () => false)

  async function load() {
    if (!isAuthed.value || loaded.value || loading.value) return
    loading.value = true
    try {
      const res = await apiFetch<RecentSearch[]>('/search/recent', { method: 'GET' })
      recents.value = (res.data ?? []) as RecentSearch[]
      loaded.value = true
    } catch {
      recents.value = []
    } finally {
      loading.value = false
    }
  }

  async function recordUser(user: FollowListUser) {
    if (!isAuthed.value) return
    const existing = recents.value.find((r) => r.user?.id === user.id)
    if (existing) {
      recents.value = [existing, ...recents.value.filter((r) => r.user?.id !== user.id)]
    } else {
      const optimistic: RecentSearch = {
        id: `tmp-u-${user.id}`,
        query: user.username ? `@${user.username}` : '',
        createdAt: new Date().toISOString(),
        user,
        group: null,
      }
      recents.value = [optimistic, ...recents.value].slice(0, 10)
    }
    try {
      await apiFetch<{ recorded: boolean }>('/search/recent', {
        method: 'POST',
        body: { userId: user.id },
      })
    } catch {
      // soft-fail: the optimistic state stays
    }
  }

  async function recordGroup(group: CommunityGroupShell) {
    if (!isAuthed.value) return
    const existing = recents.value.find((r) => r.group?.id === group.id)
    if (existing) {
      recents.value = [existing, ...recents.value.filter((r) => r.group?.id !== group.id)]
    } else {
      const optimistic: RecentSearch = {
        id: `tmp-g-${group.id}`,
        query: group.name,
        createdAt: new Date().toISOString(),
        user: null,
        group: {
          id: group.id,
          slug: group.slug,
          name: group.name,
          avatarImageUrl: group.avatarImageUrl,
          memberCount: group.memberCount,
        } satisfies RecentSearchGroup,
      }
      recents.value = [optimistic, ...recents.value].slice(0, 10)
    }
    try {
      await apiFetch<{ recorded: boolean }>('/search/recent', {
        method: 'POST',
        body: { groupId: group.id },
      })
    } catch {
      // soft-fail: the optimistic state stays
    }
  }

  async function remove(id: string) {
    if (!isAuthed.value) return
    recents.value = recents.value.filter((r) => r.id !== id)
    try {
      await apiFetch(`/search/recent/${encodeURIComponent(id)}`, { method: 'DELETE' })
    } catch {
      // soft-fail
    }
  }

  async function clearAll() {
    if (!isAuthed.value) return
    recents.value = []
    try {
      await apiFetch('/search/recent', { method: 'DELETE' })
    } catch {
      // soft-fail
    }
  }

  /** Called after the user actually runs a search (server records it as a side effect,
   *  but we refresh the local list so the new query appears in the panel immediately). */
  function invalidate() {
    loaded.value = false
  }

  return { recents, loaded, loading, load, recordUser, recordGroup, remove, clearAll, invalidate }
}
