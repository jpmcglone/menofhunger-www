import type { AdminCapabilityDto } from '~/types/api'

export function useAdminCapabilities() {
  const { apiFetchData } = useApiClient()
  return useAsyncData('admin-capabilities', () => apiFetchData<AdminCapabilityDto[]>('/admin/assistant/capabilities'))
}
