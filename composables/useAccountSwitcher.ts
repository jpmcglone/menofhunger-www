import type { SwitchableAccount, WsAccountsBadgeUpdatedPayload } from '~/types/api'
import { getSafeUserErrorMessage } from '~/utils/api-error'
import { mergeSwitchableAccountBadges } from '~/utils/switchable-account-badges'
import type { AccountsCallback } from '~/composables/presence/types'

let refreshInFlight: Promise<void> | null = null

export function useAccountSwitcher() {
  const { listSwitchableAccounts, switchAccount, isImpersonating, isAuthed, user } = useAuth()
  const toast = useAppToast()

  const accounts = useState<SwitchableAccount[]>('switchable-accounts', () => [])
  const pendingBadges = useState<Record<string, number>>('switchable-accounts-pending-badges', () => ({}))
  const loading = useState<boolean>('switchable-accounts-loading', () => false)
  const switchingId = useState<string | null>('switchable-accounts-switching', () => null)
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
    if (refreshInFlight) return refreshInFlight
    refreshInFlight = (async () => {
      if (isImpersonating.value || !isAuthed.value) {
        accounts.value = []
        pendingBadges.value = {}
        return
      }
      loading.value = true
      try {
        const fetched = await listSwitchableAccounts()
        accounts.value = mergeSwitchableAccountBadges(fetched, pendingBadges.value)
        pendingBadges.value = {}
      } catch {
        accounts.value = []
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

  function markCurrent(userId: string) {
    accounts.value = accounts.value.map((account) => ({
      ...account,
      isCurrent: account.id === userId,
    }))
  }

  async function switchTo(userId: string, opts?: { then?: string }) {
    const target = accounts.value.find((a) => a.id === userId)
    if (!target || target.isCurrent || switchingId.value) return

    const previous = accounts.value
    switchingId.value = userId
    markCurrent(userId)
    try {
      await switchAccount(userId, opts)
    } catch (e) {
      accounts.value = previous
      toast.push({
        title: getSafeUserErrorMessage(e, 'Could not switch accounts.'),
        tone: 'error',
      })
    } finally {
      switchingId.value = null
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
