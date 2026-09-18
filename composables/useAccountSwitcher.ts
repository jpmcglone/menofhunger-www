import type { SwitchableAccount, WsAccountsBadgeUpdatedPayload } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'
import { mergeSwitchableAccountBadges } from '~/utils/switchable-account-badges'
import type { AccountsCallback } from '~/composables/presence/types'
import { getAuthGeneration } from '~/composables/auth/authState'

let refreshInFlight: Promise<void> | null = null

export function useAccountSwitcher() {
  const { listSwitchableAccounts, switchAccount, isImpersonating, isAuthed, user } = useAuth()
  const toast = useAppToast()

  const accounts = useState<SwitchableAccount[]>('switchable-accounts', () => [])
  const pendingBadges = useState<Record<string, number>>('switchable-accounts-pending-badges', () => ({}))
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
        accounts.value = mergeSwitchableAccountBadges(fetched, pendingBadges.value)
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
    pendingBadges.value = { ...pendingBadges.value, [userId]: next }
    const found = accounts.value.some((account) => account.id === userId)
    if (found) {
      accounts.value = accounts.value.map((account) =>
        account.id === userId ? { ...account, unreadBadgeCount: next } : account,
      )
      return
    }
    void refresh()
  }

  async function switchTo(userId: string, opts?: { then?: string }) {
    const target = accounts.value.find((a) => a.id === userId)
    if (!target || target.isCurrent || switchingId.value) return

    try {
      await switchAccount(userId, { ...opts, label: target.name || target.username || 'your account' })
    } catch (e) {
      toast.push({
        title: getSafeUserErrorMessage(e, 'Could not switch accounts.'),
        tone: 'error',
      })
    }
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

  return { accounts, canSwitch, loading, switchingId, otherAccountsUnread, refresh, switchTo }
}
