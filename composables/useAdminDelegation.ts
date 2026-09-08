import type { DelegationWorkspaceDto, DelegationJobDto } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'

export function useAdminDelegation(jobId: Ref<string | undefined>) {
  const { apiFetchData } = useApiClient()
  const { user } = useAuth()
  const { addAdminCallback, removeAdminCallback, isSocketConnected } = usePresence()
  const workspace = ref<DelegationWorkspaceDto | null>(null)
  const job = ref<DelegationJobDto | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)
  const busy = ref(false)
  let active = false
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const identity = () => JSON.stringify([user.value?.id, user.value?.siteAdmin, user.value?.impersonation, user.value?.accountSwitch])
  const allowed = () => user.value?.siteAdmin && !user.value?.impersonation && !user.value?.accountSwitch
  const valid = (owner: string) => active && allowed() && owner === identity()
  async function refresh(keepError = false) {
    if (!active || !allowed()) return
    const owner = identity(), request = ++generation, id = jobId.value
    loading.value = true
    if (!keepError) error.value = null
    try {
      const [data, detail] = await Promise.all([
        apiFetchData<DelegationWorkspaceDto>('/admin/delegation', { mohCache: false }),
        id ? apiFetchData<DelegationJobDto>(`/admin/delegation/jobs/${id}`, { mohCache: false }) : Promise.resolve(null),
      ])
      if (valid(owner) && request === generation) { workspace.value = data; job.value = detail }
    } catch (err) {
      if (valid(owner) && request === generation) error.value = getSafeUserErrorMessage(err, 'Could not load delegated work. Try Refresh.')
    } finally { if (request === generation) loading.value = false }
  }
  async function mutate<T>(path: string, body: unknown, method: 'POST' | 'PATCH' = 'POST'): Promise<T | null> {
    if (busy.value || !allowed()) return null
    const owner = identity()
    busy.value = true; error.value = null
    try {
      const result = await apiFetchData<T>(`/admin/delegation/${path}`, { method, body: body as Record<string, unknown>, retry: 0, mohRetry: false })
      if (!valid(owner)) return null
      await refresh()
      return result
    } catch (err) {
      if (valid(owner)) { error.value = getSafeUserErrorMessage(err, 'The result could not be confirmed. Check the latest status before trying again.'); await refresh(true) }
      return null
    } finally { if (owner === identity()) busy.value = false }
  }
  async function older() {
    const current = job.value, owner = identity(), request = generation
    if (!current?.nextRunCursor || loading.value) return
    loading.value = true
    try {
      const data = await apiFetchData<DelegationJobDto>(`/admin/delegation/jobs/${current.id}`, { query: { before: current.nextRunCursor }, mohCache: false })
      if (valid(owner) && request === generation && job.value?.id === current.id) {
        const seen = new Set(job.value.runs.map(r => r.id))
        job.value = { ...job.value, nextRunCursor: data.nextRunCursor, runs: [...job.value.runs, ...data.runs.filter(r => !seen.has(r.id))] }
      }
    } catch (err) { if (valid(owner)) error.value = getSafeUserErrorMessage(err, 'Could not load earlier runs.') }
    finally { if (request === generation) loading.value = false }
  }
  function scheduleRefresh() { if (!active) return; clearTimeout(timer); timer = setTimeout(() => { void refresh() }, 200) }
  const callback = { onUpdated: ({ kind }: { kind: string }) => { if (kind === 'assistant') scheduleRefresh() } }
  const visible = () => { if (document.visibilityState === 'visible') scheduleRefresh() }
  function activate() {
    if (active) return
    active = true; addAdminCallback(callback)
    window.addEventListener('online', scheduleRefresh); window.addEventListener('focus', scheduleRefresh); document.addEventListener('visibilitychange', visible)
    void refresh()
  }
  function deactivate() {
    if (!active) return
    active = false; ++generation; clearTimeout(timer); removeAdminCallback(callback)
    window.removeEventListener('online', scheduleRefresh); window.removeEventListener('focus', scheduleRefresh); document.removeEventListener('visibilitychange', visible)
  }
  onMounted(activate); onActivated(activate); onDeactivated(deactivate); onBeforeUnmount(deactivate)
  watch(isSocketConnected, connected => { if (connected) scheduleRefresh() })
  watch(identity, () => { ++generation; workspace.value = null; job.value = null; error.value = null; busy.value = false; scheduleRefresh() })
  watch(jobId, () => { ++generation; job.value = null; scheduleRefresh() })
  return { workspace, job, error, loading, busy, refresh, mutate, older }
}
