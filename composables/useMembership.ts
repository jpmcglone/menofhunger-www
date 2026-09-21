import { useEventListener } from '@vueuse/core'
import type { BillingMe } from '~/types/api'
import type { UsersCallback } from '~/composables/usePresence'
import { getAuthGeneration } from '~/composables/auth/authState'
import { membershipTier } from '~/utils/membership'

export function useMembership() {
  const { user } = useAuth()
  const { apiFetchData } = useApiClient()
  const { addUsersCallback, removeUsersCallback } = usePresence()
  const billing = ref<BillingMe | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentTier = computed(() => membershipTier(user.value, billing.value))
  let version = 0
  let active = false
  let request: Promise<BillingMe | null> | null = null

  function refresh(): Promise<BillingMe | null> {
    if (!active || !user.value) return Promise.resolve(null)
    if (request) return request
    const identity = user.value.id
    const epoch = getAuthGeneration()
    const ticket = version
    const valid = () => active && ticket === version && user.value?.id === identity && getAuthGeneration() === epoch
    loading.value = true
    error.value = null
    request = (async () => {
      try {
        const result = await apiFetchData<BillingMe>('/billing/me', { method: 'GET' })
        if (!valid()) return null
        billing.value = result
        return result
      } catch {
        if (valid()) error.value = 'Couldn’t load membership. Try again before choosing a paid plan.'
        return null
      } finally {
        if (valid()) { loading.value = false; request = null }
      }
    })()
    return request
  }

  function invalidate() {
    version += 1
    request = null
    billing.value = null
    error.value = null
    loading.value = false
    void refresh()
  }
  const callbacks: UsersCallback = { onMeUpdated: invalidate }
  watch(() => [user.value?.id, user.value?.premium, user.value?.premiumPlus, user.value?.verifiedStatus], invalidate)
  onMounted(() => { active = true; addUsersCallback(callbacks); void refresh() })
  onActivated(() => { active = true; void refresh() })
  onDeactivated(() => { active = false; version += 1; request = null; loading.value = false })
  onBeforeUnmount(() => { active = false; version += 1; removeUsersCallback(callbacks) })
  useEventListener(import.meta.client ? document : undefined, 'visibilitychange', () => {
    if (document.visibilityState === 'visible') void refresh()
  })
  return { user, billing, loading, error, currentTier, refresh }
}
