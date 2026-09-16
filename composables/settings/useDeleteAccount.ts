import { usePresence } from '~/composables/usePresence'
import { usePushNotifications } from '~/composables/usePushNotifications'
import { clearAuthClientState } from '~/composables/auth/authState'
import { clearMohCacheAll, useApiClient } from '~/composables/useApiClient'
import { getApiErrorMessage } from '~/utils/api-error'

export function useDeleteAccount() {
  const { apiFetchData } = useApiClient()
  const { emitLogout } = usePresence()
  const { onLogout } = usePushNotifications()

  const deleting = ref(false)
  const error = ref<string | null>(null)

  async function deleteAccount(params: { reason?: string | null; details?: string | null }) {
    if (deleting.value) return
    deleting.value = true
    error.value = null
    try {
      const result = await apiFetchData<{ success: boolean; deletionScheduledAt: string; deletionStatusToken: string }>('/auth/account/delete', {
        method: 'POST',
        body: {
          reason: params.reason || null,
          details: params.details || null,
        },
      })
      if (!result.success || !result.deletionScheduledAt || !result.deletionStatusToken) {
        throw new Error('We could not confirm your deletion request. Please try again.')
      }
      await onLogout().catch(() => undefined)

      // Best-effort: notify presence before nuking local state.
      try { emitLogout() } catch { /* no-op */ }

      clearMohCacheAll()
      clearAuthClientState({ resetViewerCaches: true })

      await navigateTo(`/deletion-status#${encodeURIComponent(result.deletionStatusToken)}`, { replace: true })
    } catch (e) {
      error.value = getApiErrorMessage(e) || 'Something went wrong. Please try again.'
    } finally {
      deleting.value = false
    }
  }

  return { deleting, error, deleteAccount }
}
