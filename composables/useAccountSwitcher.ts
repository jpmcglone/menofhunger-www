import type { SwitchableAccount, WsAccountsBadgeUpdatedPayload } from '~/types/api'
import { mergeSwitchableAccountBadges } from '~/utils/switchable-account-badges'
import type { AccountsCallback } from '~/composables/presence/types'
import { getAuthGeneration } from '~/composables/auth/authState'

let refreshInFlight: Promise<void> | null = null

export function useAccountSwitcher() {
  const { listSwitchableAccounts, switchAccount, isImpersonating, isAuthed, user } = useAuth()
  const { run } = useAsyncAction()

  const accounts = useState<SwitchableAccount[]>('switchable-accounts', () => [])
  const pendingBadges = useState<Record<string, Partial<Pick<SwitchableAccount, 'unreadBadgeCount' | 'hasUnreadNotifications' | 'hasUnreadBoard'>>>>('switchable-accounts-pending-badges', () => ({}))
  const loading = useState<boolean>('switchable-accounts-loading', () => false)
  const { switchingId } = useAccountSwitchState()
  const listening = useState<boolean>('switchable-accounts-listening', () => false)

  const canSwitch = computed(
    () => !isImpersonating.value && accounts.value.length > 1,
  )

  const otherAccountsUnread = computed(() =>
    accounts.value
      .filter((account) => !account.isCurrent)
      .reduce((sum, account) => sum + Math.max(0, account.unreadBadgeCount ?? 0), 0),
  )

  const otherAccountsHaveUnread = computed(() => accounts.value.some(account => !account.isCurrent && (account.hasUnreadNotifications || account.hasUnreadBoard)))

  async function refresh() {
    if (switchingId.value) return
    if (refreshInFlight) return refreshInFlight
    refreshInFlight = (async () => {
      if (isImpersonating.value || !isAuthed.value) {
        accounts.value = []
        pendingBadges.value = {}
        return
      }
      loading.value = true
      const generation = getAuthGeneration()
      try {
        const fetched = await listSwitchableAccounts()
        if (generation !== getAuthGeneration() || switchingId.value) return
        const previous = new Map(accounts.value.map(account => [account.id, account]))
        accounts.value = mergeSwitchableAccountBadges(fetched.map(account => ({
          ...account,
          hasUnreadNotifications: account.hasUnreadNotifications ?? previous.get(account.id)?.hasUnreadNotifications,
          hasUnreadBoard: account.hasUnreadBoard ?? previous.get(account.id)?.hasUnreadBoard,
        })), pendingBadges.value)
        pendingBadges.value = {}
      } catch {
        // Keep known accounts available for retry after a transient failure.
      } finally {
        loading.value = false
      }
    })().finally(() => {
      refreshInFlight = null
    })
    return refreshInFlight
  }

  function applyBadgeUpdate(payload: WsAccountsBadgeUpdatedPayload) {
    const userId = String(payload?.userId ?? '').trim()
    if (!userId) return
    const next = Math.max(0, Math.floor(Number(payload.unreadBadgeCount) || 0))
    const patch = { unreadBadgeCount: next, ...(typeof payload.hasUnreadNotifications === 'boolean' ? { hasUnreadNotifications: payload.hasUnreadNotifications } : {}), ...(typeof payload.hasUnreadBoard === 'boolean' ? { hasUnreadBoard: payload.hasUnreadBoard } : {}) }
    pendingBadges.value = { ...pendingBadges.value, [userId]: { ...pendingBadges.value[userId], ...patch } }
    const found = accounts.value.some((account) => account.id === userId)
    if (found) {
      accounts.value = accounts.value.map((account) =>
        account.id === userId ? { ...account, ...patch } : account,
      )
      return
    }
    void refresh()
  }

  async function switchTo(userId: string, opts?: { then?: string }) {
    const target = accounts.value.find((a) => a.id === userId)
    if (!target || target.isCurrent || switchingId.value) return

    await run(() => switchAccount(userId, {
      ...opts,
      label: target.name || target.username || 'your account',
      name: target.name,
      username: target.username,
      avatarUrl: target.avatarUrl,
      avatarVideo: target.avatarVideo,
      isOrganization: target.isOrganization,
    }), { error: 'Could not switch accounts.' })
  }

  if (import.meta.client && !listening.value) {
    listening.value = true
    const { addAccountsCallback, isSocketConnected } = usePresence()
    const cb: AccountsCallback = { onBadgeUpdated: applyBadgeUpdate }
    addAccountsCallback(cb)
    watch(
      () => user.value?.id ?? null,
      (id) => {
        if (id) void refresh()
        else {
          accounts.value = []
          pendingBadges.value = {}
        }
      },
      { immediate: true },
    )

    const hasSeenSocket = ref(isSocketConnected.value)
    watch(isSocketConnected, (connected) => {
      if (!connected || !user.value?.id) return
      if (!hasSeenSocket.value) {
        hasSeenSocket.value = true
        return
      }
      void refresh()
    })
  }

  return { accounts, canSwitch, loading, switchingId, otherAccountsUnread, otherAccountsHaveUnread, refresh, switchTo }
}
