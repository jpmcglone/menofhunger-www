/**
 * Global block state manager.
 *
 * Tracks who the authenticated viewer has blocked. Provides block/unblock
 * actions and reactive query helpers. Intentionally lightweight — one shared
 * reactive instance across the entire app via useState.
 *
 * "Blocked by" state (who has blocked the viewer) is provided per-context
 * via API responses (e.g. FeedPost.viewerBlockStatus, UserPreview.userHasBlockedViewer)
 * rather than cached here, since the viewer can't enumerate their blockers.
 */

import type { MessageBlockListItem } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'

const BLOCKS_KEY = 'blockState:blockedIds'

export function useBlockState() {
  const { apiFetch } = useApiClient()

  // Persisted in Nuxt state so all composable calls share one instance.
  const blockedIds = useState<Set<string>>(BLOCKS_KEY, () => new Set<string>())
  const loaded = useState<boolean>('blockState:loaded', () => false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(opts?: { force?: boolean }) {
    if (loaded.value && !opts?.force) return
    loading.value = true
    error.value = null
    try {
      const res = await apiFetch<MessageBlockListItem[]>('/messages/blocks')
      const ids = new Set<string>((res.data ?? []).map((item) => item.blocked.id))
      blockedIds.value = ids
      loaded.value = true
    } catch (e: unknown) {
      error.value = getApiErrorMessage(e) || 'Failed to load blocked users.'
    } finally {
      loading.value = false
    }
  }

  async function blockUser(userId: string) {
    try {
      await apiFetch('/messages/blocks', { method: 'POST', body: { user_id: userId } })
      blockedIds.value = new Set([...blockedIds.value, userId])
    } catch (e: unknown) {
      throw new Error(getApiErrorMessage(e) || 'Failed to block user.')
    }
  }

  async function unblockUser(userId: string) {
    try {
      await apiFetch(`/messages/blocks/${userId}`, { method: 'DELETE' })
      const next = new Set(blockedIds.value)
      next.delete(userId)
      blockedIds.value = next
    } catch (e: unknown) {
      throw new Error(getApiErrorMessage(e) || 'Failed to unblock user.')
    }
  }

  function isBlockedByMe(userId: string): boolean {
    return blockedIds.value.has(userId)
  }

  return {
    blockedIds,
    loaded,
    loading,
    error,
    load,
    blockUser,
    unblockUser,
    isBlockedByMe,
  }
}
