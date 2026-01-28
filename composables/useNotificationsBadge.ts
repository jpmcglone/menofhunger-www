export function useNotificationsBadge() {
  const { user } = useAuth()
  const colorMode = useColorMode()

  // Fake count for now.
  const count = computed(() => 5)
  const show = computed(() => count.value > 0)

  const isAuthed = computed(() => Boolean(user.value?.id))
  const isVerified = computed(() => Boolean(user.value?.verifiedStatus && user.value.verifiedStatus !== 'none'))
  const isPremium = computed(() => Boolean(user.value?.premium))
  const isDark = computed(() => (colorMode.value as string) === 'dark')

  const toneClass = computed(() => {
    // Premium: orange. Verified: blue.
    if (isAuthed.value && isPremium.value) return 'bg-amber-500 text-white'
    if (isAuthed.value && isVerified.value) return 'bg-sky-500 text-white'
    // Logged out or unverified: high-contrast.
    return isDark.value ? 'bg-white text-black' : 'bg-black text-white'
  })

  return { count, show, toneClass }
}

