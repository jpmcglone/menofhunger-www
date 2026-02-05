import { getApiErrorMessage } from '~/utils/api-error'

export function useFormSubmit<T>(
  submitFn: () => Promise<T>,
  options?: {
    defaultError?: string
    onSuccess?: (result: T) => void
    onError?: (message: string) => void
  },
) {
  const submitting = ref(false)
  const submitError = ref<string | null>(null)

  const submit = async () => {
    if (submitting.value) return
    submitError.value = null
    submitting.value = true
    try {
      const result = await submitFn()
      options?.onSuccess?.(result)
      return result
    } catch (e: unknown) {
      const message = getApiErrorMessage(e) || options?.defaultError || 'Failed to submit.'
      submitError.value = message
      options?.onError?.(message)
    } finally {
      submitting.value = false
    }
  }

  return {
    submit,
    submitError,
    submitting,
  }
}
