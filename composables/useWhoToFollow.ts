import type { FollowListUser, GetFollowRecommendationsData } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

export function useWhoToFollow(options?: { enabled?: Ref<boolean>; defaultLimit?: number }) {
  const { apiFetch } = useApiClient()
  const { user } = useAuth()

  const enabled = options?.enabled ?? ref(true)
  const defaultLimit = Math.max(1, Math.min(50, Math.floor(options?.defaultLimit ?? 6)))

  const users = ref<FollowListUser[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthed = computed(() => Boolean(user.value?.id))

  async function refresh(opts?: { limit?: number }) {
    if (!enabled.value) return

    loading.value = true
    error.value = null
    try {
      const path = isAuthed.value ? '/follows/recommendations' : '/follows/top-users'
      const res = await apiFetch<GetFollowRecommendationsData>(path, {
        method: 'GET',
        query: { limit: Math.max(1, Math.min(50, Math.floor(opts?.limit ?? defaultLimit))) },
      })
      users.value = (res.data ?? []) as GetFollowRecommendationsData
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load suggestions.'
      users.value = []
    } finally {
      loading.value = false
    }
  }

  // Auto-refresh when enabled + authed.
  watch(
    [enabled, isAuthed],
    ([on, authed]) => {
      if (on) void refresh({ limit: defaultLimit })
    },
    { immediate: true },
  )

  function removeUserById(userId: string) {
    const id = (userId ?? '').trim()
    if (!id) return
    users.value = users.value.filter((u) => u.id !== id)
  }

  return {
    users,
    loading,
    error,
    refresh,
    removeUserById,
  }
}

