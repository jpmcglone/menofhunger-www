import { ref, type Ref } from 'vue'
import { useAppToast, type AppToastTone } from '~/composables/useAppToast'
import { getApiErrorMessage } from '~/utils/api-error'

export type AsyncActionOptions<T> = {
  /**
   * Error toast title. A string is used as the fallback when the API error carries no friendly message;
   * a function receives the raw error and returns the exact title (use it for fixed messages).
   */
  error?: string | ((e: unknown) => string)
  /** Error toast tone (default `error`). */
  tone?: AppToastTone
  /** Error toast duration in ms (omit for the toast default). */
  durationMs?: number
  /** Suppress the error toast (the error is still stored in `error`). */
  silent?: boolean
  /** Runs before the error toast; use it to roll back optimistic state. */
  rollback?: (e: unknown) => void
  /** Runs after a successful action with its result. */
  onSuccess?: (result: T) => void
  /** Runs when the action throws (after rollback and toast). */
  onError?: (e: unknown) => void
}

export type UseAsyncActionReturn = {
  run: <T>(fn: () => Promise<T>, options?: AsyncActionOptions<T>) => Promise<T | undefined>
  pending: Ref<boolean>
  error: Ref<unknown>
}

const DEFAULT_ERROR = 'Something went wrong. Please try again.'

/**
 * Runs an async action with the standard "try / catch -> error toast" handling.
 * `run` resolves with the result, or `undefined` when the action threw. Concurrent runs are allowed;
 * `pending` stays true until all of them settle.
 */
export function useAsyncAction(): UseAsyncActionReturn {
  const toast = useAppToast()
  const pending = ref(false)
  const error = ref<unknown>(null)
  let inFlight = 0

  async function run<T>(fn: () => Promise<T>, options: AsyncActionOptions<T> = {}): Promise<T | undefined> {
    inFlight += 1
    pending.value = true
    error.value = null
    try {
      const result = await fn()
      options.onSuccess?.(result)
      return result
    } catch (e) {
      error.value = e
      options.rollback?.(e)
      if (!options.silent) {
        const opt = options.error
        const title = typeof opt === 'function' ? opt(e) : getApiErrorMessage(e) || opt || DEFAULT_ERROR
        toast.push({
          title,
          tone: options.tone ?? 'error',
          ...(options.durationMs !== undefined ? { durationMs: options.durationMs } : {}),
        })
      }
      options.onError?.(e)
      return undefined
    } finally {
      inFlight -= 1
      if (inFlight === 0) pending.value = false
    }
  }

  return { run, pending, error }
}
