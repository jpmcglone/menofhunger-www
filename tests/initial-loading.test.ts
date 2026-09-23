import { describe, expect, it } from 'vitest'
import { effectScope, ref } from 'vue'
import { useInitialLoading } from '~/composables/useInitialLoading'

describe('initial versus subsequent loading', () => {
  it('shows a spinner before the mounted request starts, then preserves a known-empty result', () => {
    const scope = effectScope()
    const loading = ref(false)
    const rows = ref<string[]>([])
    const initial = scope.run(() => useInitialLoading(loading, () => rows.value.length > 0))!
    expect(initial.value).toBe(true)
    loading.value = true
    expect(initial.value).toBe(true)
    loading.value = false
    expect(initial.value).toBe(false)
    loading.value = true
    expect(initial.value).toBe(false)
    scope.stop()
  })

  it('keeps established rows visible during refresh and after the last row is removed', () => {
    const scope = effectScope()
    const rows = ref(['one'])
    const loading = ref(false)
    const initial = scope.run(() => useInitialLoading(loading, () => rows.value.length > 0))!
    expect(initial.value).toBe(false)
    rows.value = []
    loading.value = true
    expect(initial.value).toBe(false)
    scope.stop()
  })

  it('lets a first-request error render and keeps it retryable', () => {
    const scope = effectScope()
    const loading = ref(false)
    const error = ref<string | null>(null)
    const initial = scope.run(() => useInitialLoading(loading, false, error))!
    loading.value = true
    error.value = 'Offline'
    loading.value = false
    expect(initial.value).toBe(false)
    error.value = null
    loading.value = true
    expect(initial.value).toBe(false)
    scope.stop()
  })
})
