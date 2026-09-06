import type { MaybeRefOrGetter } from 'vue'
import { getSafeUserErrorMessage } from '~/utils/api-error'

/** Shared lifecycle for private admin/MARV panels; older identity/filter responses never win. */
export function usePrivateApiData<T>(path: MaybeRefOrGetter<string>, query: MaybeRefOrGetter<Record<string, string | number | boolean | null | undefined>> = {}, enabled: MaybeRefOrGetter<boolean> = true) {
  const { apiFetchData } = useApiClient()
  const { user } = useAuth()
  const presence = usePresence()
  const data = shallowRef<T | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)
  let generation = 0
  let mounted = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const owner = () => user.value && !user.value.impersonation && !user.value.accountSwitch && (!toValue(path).startsWith('/admin/') || user.value.siteAdmin) ? user.value.id : null
  async function refresh() {
    const id = owner()
    const ticket = ++generation
    if (!id || !toValue(enabled)) { data.value = null; loading.value = false; return }
    loading.value = true
    error.value = null
    try {
      const result = await apiFetchData<T>(toValue(path), { query: toValue(query), retry: 0 })
      if (ticket === generation && owner() === id) data.value = result
    } catch (err) {
      if (ticket === generation && owner() === id) error.value = getSafeUserErrorMessage(err, 'Could not load this view. Try again.')
    } finally { if (ticket === generation) loading.value = false }
  }
  function schedule() {
    if (!mounted || !toValue(enabled)) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { void refresh() }, 200)
  }
  const adminCallback = { onUpdated: () => { if (toValue(path).startsWith('/admin/')) schedule() } }
  const marvCallback = { onActionsUpdated: () => { if (toValue(path) === '/marvin/actions') schedule() } }
  const visible = () => { if (document.visibilityState === 'visible') schedule() }
  onMounted(() => {
    mounted = true
    void refresh()
    presence.addAdminCallback(adminCallback)
    presence.addMarvCallback(marvCallback)
    window.addEventListener('focus', schedule)
    document.addEventListener('visibilitychange', visible)
  })
  onActivated(schedule)
  onBeforeUnmount(() => {
    mounted = false
    ++generation
    if (timer) clearTimeout(timer)
    presence.removeAdminCallback(adminCallback)
    presence.removeMarvCallback(marvCallback)
    window.removeEventListener('focus', schedule)
    document.removeEventListener('visibilitychange', visible)
  })
  watch(() => [owner(), toValue(path), toValue(query), toValue(enabled)], () => {
    ++generation
    data.value = null
    error.value = null
    if (mounted) void refresh()
  }, { deep: true })
  watch(presence.isSocketConnected, connected => { if (connected) schedule() })
  return { data, error, loading, refresh }
}
