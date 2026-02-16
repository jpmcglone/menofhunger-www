import type { Ref } from 'vue'
import type { UsernameAvailabilityStatus } from '~/composables/useUsernameAvailability'

export type UsernameFieldStatus = UsernameAvailabilityStatus | 'checking' | 'unknown' | 'same'

export function useUsernameField(opts: {
  value: Ref<string>
  currentUsername?: Ref<string | null | undefined>
  usernameIsSet?: Ref<boolean>
  debounceMs?: number
  lockedInvalidMessage?: string | (() => string)
  caseOnlyMessage?: string | (() => string)
}) {
  const { check } = useUsernameAvailability()

  const status = ref<UsernameFieldStatus>('unknown')
  const helperText = ref<string | null>(null)

  const currentUsername = computed(() => (opts.currentUsername?.value ?? '').toString().trim())
  const currentUsernameLower = computed(() => currentUsername.value.toLowerCase())
  const desiredUsernameLower = computed(() => opts.value.value.trim().toLowerCase())

  const usernameIsSet = computed(() => Boolean(opts.usernameIsSet?.value))
  const isCaseOnlyChange = computed(() => {
    const cur = currentUsernameLower.value
    const desired = desiredUsernameLower.value
    if (!cur || !desired) return false
    return cur === desired
  })

  const checking = computed(() => status.value === 'checking')

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  function reset() {
    helperText.value = null
    status.value = 'unknown'
  }

  async function runCheck(trimmedUsername: string) {
    status.value = 'checking'
    helperText.value = null
    const res = await check(trimmedUsername)
    status.value = res.status
    helperText.value = res.message
  }

  watch(
    opts.value,
    (v) => {
      if (debounceTimer) clearTimeout(debounceTimer)
      reset()

      const trimmed = (v ?? '').toString().trim()
      if (!trimmed) return

      if (usernameIsSet.value) {
        if (isCaseOnlyChange.value) {
          status.value = 'same'
          helperText.value =
            typeof opts.caseOnlyMessage === 'function'
              ? opts.caseOnlyMessage()
              : (opts.caseOnlyMessage ?? 'Only capitalization changes are allowed (this change is OK).')
          return
        }
        status.value = 'invalid'
        helperText.value =
          typeof opts.lockedInvalidMessage === 'function'
            ? opts.lockedInvalidMessage()
            : (opts.lockedInvalidMessage ?? 'Only capitalization changes are allowed for your username.')
        return
      }

      debounceTimer = setTimeout(() => {
        void runCheck(trimmed)
      }, opts.debounceMs ?? 500)
    },
    // IMPORTANT (SSR/hydration): run synchronously so server + client initial render match.
    { flush: 'sync' },
  )

  onBeforeUnmount(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
  })

  return {
    status,
    helperText,
    checking,
    isCaseOnlyChange,
    currentUsernameLower,
    desiredUsernameLower,
  }
}

