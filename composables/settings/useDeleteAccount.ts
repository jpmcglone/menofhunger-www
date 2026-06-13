import { clearAuthClientState } from '~/composables/auth/authState'
import { clearMohCacheAll } from '~/composables/useApiClient'
import { getApiErrorMessage } from '~/utils/api-error'

export function useDeleteAccount() {
  const { apiFetch } = useApiClient()
  const { emitLogout } = usePresence()
  const { onLogout } = usePushNotifications()

  const deleting = ref(false)
  const error = ref<string | null>(null)

  async function deleteAccount(params: { reason?: string | null; details?: string | null }) {
    if (deleting.value) return
    deleting.value = true
    error.value = null
    try {
      await apiFetch<{ success: true }>('/auth/account/delete', {
        method: 'POST',
        body: {
          reason: params.reason || null,
          details: params.details || null,
        },
      })

      // Best-effort: notify presence + clear push token before nuking local state.
      try { emitLogout() } catch { /* no-op */ }
      await onLogout().catch(() => undefined)

      clearMohCacheAll()
      clearAuthClientState({ resetViewerCaches: true })

      await navigateTo('/login?deleted=1', { replace: true })
    } catch (e) {
      error.value = getApiErrorMessage(e) || 'Something went wrong. Please try again.'
    } finally {
      deleting.value = false
    }
  }

  return { deleting, error, deleteAccount }
}
