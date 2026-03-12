export const APP_FEATURE_TOGGLES = ['articles'] as const

export type AppFeatureToggle = (typeof APP_FEATURE_TOGGLES)[number]

export const APP_FEATURE_TOGGLE_OPTIONS: Array<{ value: AppFeatureToggle; label: string }> = [
  { value: 'articles', label: 'Articles' },
]
