/** The lightweight queue count follows the shared private-data realtime lifecycle. */
export function useAdminVerificationCount() {
  const { data, refresh } = usePrivateApiData<{ pending: number }>('/admin/verification/count')
  const pending = computed(() => data.value?.pending ?? 0)
  return { pending, refresh }
}
