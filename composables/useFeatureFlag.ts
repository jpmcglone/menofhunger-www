import type { PostHog } from 'posthog-js'

export type FeatureFlagValue = string | boolean

type FlagClient = Pick<PostHog, 'onFeatureFlags' | 'getFeatureFlag'>

/**
 * Calls `onChange` with the flag's current value whenever PostHog loads or reloads flags
 * (including after identify). Unknown flags report `fallback`. Returns an unsubscribe.
 */
export function subscribeFeatureFlag(
  client: FlagClient | null | undefined,
  key: string,
  fallback: FeatureFlagValue,
  onChange: (value: FeatureFlagValue) => void,
): () => void {
  if (!client) return () => {}
  return client.onFeatureFlags(() => {
    onChange(client.getFeatureFlag(key) ?? fallback)
  })
}

/**
 * Multivariate PostHog flag. SSR and the first client render always use `fallback`;
 * the real value arrives after mount, so gated UI must tolerate a post-hydration switch.
 */
export function useFeatureFlagVariant(key: string, fallback: FeatureFlagValue = false) {
  const value = ref<FeatureFlagValue>(fallback)
  const nuxtApp = useNuxtApp()
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    unsubscribe = subscribeFeatureFlag(nuxtApp.$posthog as FlagClient | null, key, fallback, (next) => {
      value.value = next
    })
  })
  onBeforeUnmount(() => unsubscribe?.())

  return readonly(value)
}

/** Boolean PostHog flag; any enabled variant counts as on. See `useFeatureFlagVariant`. */
export function useFeatureFlag(key: string, fallback = false) {
  const variant = useFeatureFlagVariant(key, fallback)
  return computed(() => variant.value !== false)
}
