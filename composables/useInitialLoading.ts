import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

/** Distinguishes an unresolved first request from an established (possibly empty) result. */
export function useInitialLoading(
  loading: MaybeRefOrGetter<boolean>,
  hasData: MaybeRefOrGetter<boolean>,
  error: MaybeRefOrGetter<unknown> = null,
) {
  const resolved = ref(toValue(hasData) || Boolean(toValue(error)))
  watch(() => toValue(loading), (pending, wasPending) => {
    if (wasPending && !pending) resolved.value = true
  }, { flush: 'sync' })
  watch(() => toValue(hasData), (present) => {
    if (present) resolved.value = true
  }, { flush: 'sync' })
  return computed(() => !resolved.value && !toValue(hasData) && !toValue(error))
}
