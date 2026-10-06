import type { CommunityGroupShell } from '~/types/api'

/**
 * Session cache of group shells resolved from `&slug` mentions. A slug that
 * is not a group resolves to null and stays plain text. Lookups are deduped
 * and fetched once per slug.
 */
const inFlight = new Map<string, Promise<void>>()

export function useGroupMentionShells() {
  const { apiFetchData } = useApiClient()
  const shells = useState<Record<string, CommunityGroupShell | null>>('group-mention-shells', () => ({}))

  function resolve(slug: string): Promise<void> {
    const key = slug.toLowerCase()
    if (key in shells.value) return Promise.resolve()
    const pending = inFlight.get(key)
    if (pending) return pending
    const request = apiFetchData<CommunityGroupShell>(`/groups/by-slug/${encodeURIComponent(key)}`)
      .then((shell) => { shells.value = { ...shells.value, [key]: shell?.id ? shell : null } })
      .catch(() => { shells.value = { ...shells.value, [key]: null } })
      .finally(() => inFlight.delete(key))
    inFlight.set(key, request)
    return request
  }

  function shellFor(slug: string): CommunityGroupShell | null {
    return shells.value[slug.toLowerCase()] ?? null
  }

  return { resolve, shellFor }
}
