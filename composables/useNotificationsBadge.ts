export function useNotificationsBadge() {
  const { user } = useAuth()

  // Fake count for now.
  const count = computed(() => 5)
  const show = computed(() => count.value > 0)

  const toneClass = computed(() => {
    // Always match the app's current theme tint (set in `layouts/app.vue` via `primaryTintCssForUser`):
    // - premium => orange
    // - verified => blue
    // - default => near-black (light mode) / white (dark mode)
    // Use a real CSS utility class so it works in production builds (Tailwind won't always
    // generate arbitrary-value classes when they come from computed strings).
    return 'moh-pill-primary'
  })

  // Keep `user` referenced so this recomputes immediately when auth/flags change.
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  user.value?.id

  return { count, show, toneClass }
}

