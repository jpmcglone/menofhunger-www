import { APP_FEATURE_TOGGLES, type AppFeatureToggle } from '~/config/app-feature-toggles'

export function useAppFeatures() {
  const { user } = useAuth()

  const enabledSet = computed(() => {
    const raw = Array.isArray(user.value?.featureToggles) ? user.value.featureToggles : []
    const allowed = new Set<string>(APP_FEATURE_TOGGLES)
    const out = new Set<AppFeatureToggle>()
    for (const key of raw) {
      const value = String(key ?? '').trim() as AppFeatureToggle
      if (!value || !allowed.has(value)) continue
      out.add(value)
    }
    return out
  })

  const hasFeature = (key: AppFeatureToggle): boolean => enabledSet.value.has(key)

  return { enabledSet, hasFeature }
}
