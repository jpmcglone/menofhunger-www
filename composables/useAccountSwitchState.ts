import type { AvatarVideoDto } from '~/types/api-contracts.gen'

export type AccountSwitchTransition = {
  userId: string
  label: string
  name?: string | null
  username?: string | null
  avatarUrl?: string | null
  avatarVideo?: AvatarVideoDto | null
  isOrganization?: boolean
}

/** Shared by every switch entry point, the loading surface, and the API client. */
export function useAccountSwitchState() {
  const transition = useState<AccountSwitchTransition | null>('account-switch-transition', () => null)
  const switchingId = computed(() => transition.value?.userId ?? null)

  function resumeNavigation() {
    if (import.meta.client) window.location.reload()
  }

  return { transition, switchingId, resumeNavigation }
}
