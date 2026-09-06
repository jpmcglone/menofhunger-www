import type { AdminAssistantActionDto, AdminAssistantTurnDto, AdminAssistantWorkspaceDto } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'

export function useAdminAssistant() {
  const { apiFetchData } = useApiClient()
  const { user } = useAuth()
  const { addAdminCallback, removeAdminCallback, isSocketConnected } = usePresence()
  const workspace = ref<AdminAssistantWorkspaceDto | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)
  const sending = ref(false)
  const deciding = ref<string | null>(null)
  let generation = 0
  let mounted = false
  let reloadTimer: ReturnType<typeof setTimeout> | undefined
  const currentOwner = () => user.value?.id
  const validOwner = (id: string | undefined) => mounted && id === currentOwner() && !user.value?.impersonation && !user.value?.accountSwitch
  async function refresh(options: { keepError?: boolean } = {}) {
    if (!options.keepError) error.value = null
    const owner = currentOwner()
    const request = ++generation
    loading.value = true
    try {
      const data = await apiFetchData<AdminAssistantWorkspaceDto>('/admin/assistant')
      if (validOwner(owner) && request === generation) workspace.value = data
    } catch (err) {
      if (validOwner(owner) && request === generation) error.value = getSafeUserErrorMessage(err, 'Could not load the admin workspace.')
    } finally {
      if (request === generation) loading.value = false
    }
  }
  function scheduleRefresh() {
    if (reloadTimer) clearTimeout(reloadTimer)
    reloadTimer = setTimeout(() => { void refresh() }, 200)
  }
  async function send(message: string): Promise<boolean> {
    if (sending.value || !message.trim()) return false
    const owner = currentOwner()
    sending.value = true
    error.value = null
    try {
      // Stable request identity prevents a transport retry from starting another paid AI turn.
      await apiFetchData<AdminAssistantTurnDto>('/admin/assistant/messages', { method: 'POST', body: { id: crypto.randomUUID(), message: message.trim() }, timeout: 240_000, retry: 0 })
      if (validOwner(owner)) await refresh()
      return true
    } catch (err) {
      if (validOwner(owner)) {
        error.value = getSafeUserErrorMessage(err, 'The answer could not be confirmed. Refresh to check whether MARV finished before asking again.')
        await refresh({ keepError: true })
      }
      return false
    } finally { sending.value = false }
  }
  async function decide(action: AdminAssistantActionDto, decision: 'confirm' | 'cancel') {
    if (deciding.value) return
    const owner = currentOwner()
    deciding.value = action.id
    error.value = null
    try {
      await apiFetchData<AdminAssistantActionDto>(`/admin/assistant/actions/${action.id}`, { method: 'POST', body: { decision }, retry: 0 })
      if (validOwner(owner)) await refresh()
    } catch (err) {
      if (validOwner(owner)) {
        error.value = getSafeUserErrorMessage(err, 'Could not confirm the result. Check the action status before continuing.')
        await refresh({ keepError: true })
      }
    } finally { deciding.value = null }
  }
  const callback = { onUpdated: ({ kind }: { kind: string }) => { if (kind === 'assistant') scheduleRefresh() } }
  const onVisible = () => { if (document.visibilityState === 'visible') scheduleRefresh() }
  onMounted(() => {
    mounted = true
    void refresh()
    addAdminCallback(callback)
    window.addEventListener('online', scheduleRefresh)
    window.addEventListener('focus', scheduleRefresh)
    document.addEventListener('visibilitychange', onVisible)
  })
  onBeforeUnmount(() => {
    mounted = false
    ++generation
    if (reloadTimer) clearTimeout(reloadTimer)
    removeAdminCallback(callback)
    window.removeEventListener('online', scheduleRefresh)
    window.removeEventListener('focus', scheduleRefresh)
    document.removeEventListener('visibilitychange', onVisible)
  })
  watch(isSocketConnected, (connected) => { if (connected && mounted) scheduleRefresh() })
  watch(() => [user.value?.id, user.value?.impersonation, user.value?.accountSwitch], () => {
    ++generation
    workspace.value = null
    error.value = null
  })
  return { workspace, error, loading, sending, deciding, refresh, send, decide }
}
