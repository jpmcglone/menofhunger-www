type AccountSwitchTransition = {
  userId: string
  label: string
  /** Set only after the server confirms the new session. */
  destination: string | null
}

/** Shared by every switch entry point, the loading surface, and the API client. */
export function useAccountSwitchState() {
  const transition = useState<AccountSwitchTransition | null>('account-switch-transition', () => null)
  const switchingId = computed(() => transition.value?.userId ?? null)

  function resumeNavigation() {
    const destination = transition.value?.destination
    if (import.meta.client && destination) window.location.replace(destination)
  }

  return { transition, switchingId, resumeNavigation }
}
