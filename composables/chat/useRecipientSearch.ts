import type { FollowListUser } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { userColorTier } from '~/utils/user-tier'

/**
 * Manages the new-chat recipient picker: query input, debounced user search,
 * selected recipients list, and per-recipient tag styles.
 *
 * Automatically filters out the current viewer and unverified/non-premium users
 * (same rules as the chat.vue page).
 */
export function useRecipientSearch(viewerId: Ref<string | null | undefined>) {
  const { apiFetchData } = useApiClient()

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
          query: { type: 'users', q, limit: 8 },
        })
        results.value = (res ?? [])
          .filter((u) => u.id !== viewerId.value)
          .filter((u) => userColorTier(u) !== 'normal')
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
