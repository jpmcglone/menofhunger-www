import type { useApiClient } from '~/composables/useApiClient'
import { closeBrowserNotificationsForIds } from '~/utils/browser-notifications'

/** Individual read mutation, shared by the inbox and temporary activity links. */
export async function markNotificationReadById(apiFetch: ReturnType<typeof useApiClient>['apiFetch'], id: string) {
  if (!id) return
  await apiFetch(`/notifications/${encodeURIComponent(id)}/mark-read`, { method: 'POST' })
  closeBrowserNotificationsForIds([id])
}
