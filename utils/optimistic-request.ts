import type { Ref } from 'vue'

export type OptimisticRequestOptions<TPrev, TResult> = {
  /**
   * Optional dedupe key. If provided, calls with the same key will be ignored
   * while the request is in flight.
   */
  key?: string
  inflight?: Ref<Record<string, boolean>>

  /**
   * Apply optimistic state; returns a snapshot needed to rollback.
   */
  apply: () => TPrev

  /**
   * Perform the real request.
   */
  request: () => Promise<TResult>

  /**
   * Roll back optimistic state using the snapshot from `apply`.
   */
  rollback: (prev: TPrev, error: unknown) => void

  /**
   * Optional sync step after success (e.g. reconcile with server truth).
   */
  commit?: (result: TResult) => void
}

export async function runOptimisticRequest<TPrev, TResult>(opts: OptimisticRequestOptions<TPrev, TResult>) {
  const key = (opts.key ?? '').trim()
  if (key && opts.inflight?.value?.[key]) return null

  if (key && opts.inflight) {
    opts.inflight.value = { ...opts.inflight.value, [key]: true }
  }

  const prev = opts.apply()
  try {
    const result = await opts.request()
    opts.commit?.(result)
    return result
  } catch (e: unknown) {
    opts.rollback(prev, e)
    throw e
  } finally {
    if (key && opts.inflight) {
      opts.inflight.value = { ...opts.inflight.value, [key]: false }
    }
  }
}

