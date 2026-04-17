import type { FollowListUser } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { userColorTier } from '~/utils/user-tier'

/**
 * Which users to render in the result list.
 *
 *   - 'all'           — every user returned by /search
 *   - 'verified'      — only `verifiedStatus !== 'none'`
 *   - 'premium'       — `premium` or `premiumPlus`
 *   - 'organization'  — `isOrganization`
 *
 * Selectability (whether a result can be picked) is controlled separately by
 * `requireVerified` so a caller can show everyone but only let verified users
 * be picked — see `AppUserSearchPicker`.
 */
export type RecipientShowFilter = 'all' | 'verified' | 'premium' | 'organization'

export type RecipientSearchOptions = {
  /** What to render in the list. Server still validates final eligibility. */
  show?: RecipientShowFilter
  /** User IDs to hide from the result list (already-selected, members, etc.). */
  excludeUserIds?: Ref<string[]> | ComputedRef<string[]> | string[]
  /** Page size for the /search request. */
  limit?: number
}

function passesShow(u: FollowListUser, show: RecipientShowFilter): boolean {
  if (show === 'all') return true
  if (show === 'verified') {
    const status = (u as unknown as { verifiedStatus?: string | null }).verifiedStatus ?? 'none'
    return status !== 'none'
  }
  if (show === 'premium') return Boolean(u.premium || u.premiumPlus)
  if (show === 'organization') return Boolean(u.isOrganization)
  return true
}

/**
 * Manages a recipient picker: query input, debounced user search, optional
 * multi-select state, and per-tier tag styles.
 *
 * Used by `AppUserSearchPicker` (which is in turn used by the chat new-conversation
 * flow and the crew invite dialog).
 */
export function useRecipientSearch(
  viewerId: Ref<string | null | undefined>,
  options: RecipientSearchOptions = {},
) {
  const { apiFetchData } = useApiClient()

  const show = options.show ?? 'all'
  const limit = options.limit ?? 8
  const excludeRef = computed<string[]>(() => {
    const v = options.excludeUserIds
    if (!v) return []
    if (Array.isArray(v)) return v
    return v.value ?? []
  })

  const query = ref('')
  const results = ref<FollowListUser[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const selected = ref<FollowListUser[]>([])

  const canStart = computed(() => selected.value.length > 0)

  function add(user: FollowListUser) {
    if (selected.value.find((u) => u.id === user.id)) return
    selected.value = [...selected.value, user]
    query.value = ''
    results.value = []
  }

  function remove(userId: string) {
    selected.value = selected.value.filter((u) => u.id !== userId)
  }

  function reset() {
    query.value = ''
    results.value = []
    selected.value = []
    error.value = null
  }

  function tagStyle(u: FollowListUser): Record<string, string> {
    const tier = userColorTier(u)
    if (tier === 'verified') return { background: 'var(--moh-verified-soft)', color: 'var(--moh-verified)' }
    if (tier === 'premium') return { background: 'var(--moh-premium-soft)', color: 'var(--moh-premium)' }
    if (tier === 'organization') return { background: 'var(--moh-org-soft)', color: 'var(--moh-org)' }
    return { background: 'rgba(128,128,128,0.12)', color: 'inherit' }
  }

  let searchTimer: ReturnType<typeof setTimeout> | null = null

  watch(query, (val) => {
    error.value = null
    if (searchTimer) clearTimeout(searchTimer)
    // Strip leading @ so typing "@jay" works the same as "jay".
    const q = val.trim().replace(/^@+/, '')
    if (!q) {
      results.value = []
      return
    }
    searchTimer = setTimeout(async () => {
      loading.value = true
      try {
        const res = await apiFetchData<FollowListUser[]>('/search', {
          query: { type: 'users', q, limit },
        })
        const exclude = new Set(excludeRef.value)
        results.value = (res ?? [])
          .filter((u) => u.id !== viewerId.value)
          .filter((u) => !exclude.has(u.id))
          .filter((u) => passesShow(u, show))
      } catch (e) {
        error.value = getApiErrorMessage(e) || 'Failed to search users.'
      } finally {
        loading.value = false
      }
    }, 250)
  })

  onBeforeUnmount(() => {
    if (searchTimer) {
      clearTimeout(searchTimer)
      searchTimer = null
    }
  })

  return { query, results, loading, error, selected, canStart, add, remove, reset, tagStyle }
}
