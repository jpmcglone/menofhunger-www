export function usePersonAccountGate() {
  const { user, isPageAccount, switchAccount } = useAuth()
  const { accounts, switchingId, switchTo, refresh } = useAccountSwitcher()

  const operatorFromSession = computed(() => user.value?.accountSwitch ?? null)

  const operatorFromAccounts = computed(() => {
    const person = accounts.value.find((account) => account.accountKind === 'person' && !account.isCurrent)
    if (person) return person
    return accounts.value.find((account) => !account.isCurrent) ?? null
  })

  const operatorUser = computed(() => {
    const fromSession = operatorFromSession.value
    if (fromSession?.operatorUserId) {
      return {
        id: fromSession.operatorUserId,
        username: fromSession.operatorUsername,
        name: fromSession.operatorName,
        avatarUrl: fromSession.operatorAvatarUrl,
      }
    }
    const fromAccounts = operatorFromAccounts.value
    if (!fromAccounts) return null
    return {
      id: fromAccounts.id,
      username: fromAccounts.username,
      name: fromAccounts.name,
      avatarUrl: fromAccounts.avatarUrl,
    }
  })

  const operatorLabel = computed(() => {
    const username = (operatorUser.value?.username ?? '').trim()
    if (username) return `@${username}`
    const name = (operatorUser.value?.name ?? '').trim()
    return name || 'your account'
  })

  async function switchToOperator(then?: string) {
    const operatorUserId = String(operatorUser.value?.id ?? '').trim()
    if (!operatorUserId || switchingId.value) return
    if (accounts.value.some((account) => account.id === operatorUserId)) {
      await switchTo(operatorUserId, { then })
      return
    }
    switchingId.value = operatorUserId
    try {
      await switchAccount(operatorUserId, { then })
    } finally {
      switchingId.value = null
    }
  }

  return {
    isPageAccount,
    operator: operatorFromSession,
    operatorUser,
    operatorLabel,
    switchingId,
    refreshAccounts: refresh,
    switchToOperator,
  }
}
