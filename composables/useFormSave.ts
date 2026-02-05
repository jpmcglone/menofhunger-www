import { getApiErrorMessage } from '~/utils/api-error'

export function useFormSave<T>(
  saveFn: () => Promise<T>,
  options?: {
    defaultError?: string
    onSuccess?: (result: T) => void
    onError?: (message: string) => void
  },
) {
  const saving = ref(false)
  const saved = ref(false)
  const error = ref<string | null>(null)

  const save = async () => {
    if (saving.value) return
    saved.value = false
    error.value = null
    saving.value = true
    try {
      const result = await saveFn()
      saved.value = true
      options?.onSuccess?.(result)
      return result
    } catch (e: unknown) {
      const message = getApiErrorMessage(e) || options?.defaultError || 'Failed to save.'
      error.value = message
      options?.onError?.(message)
    } finally {
      saving.value = false
    }
  }

  return {
    error,
    save,
    saved,
    saving,
  }
}
