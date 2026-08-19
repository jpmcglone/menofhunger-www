export function usePersonAccountGate() {
  const { user, isPageAccount, switchAccount } = useAuth()
  const { switchingId } = useAccountSwitcher()

  const operator = computed(() => user.value?.accountSwitch ?? null)
  const operatorLabel = computed(() => {
    const username = (operator.value?.operatorUsername ?? '').trim()
    if (username) return `@${username}`
    const name = (operator.value?.operatorName ?? '').trim()
    return name || 'your account'
  })

  async function switchToOperator(then?: string) {
    const operatorUserId = String(operator.value?.operatorUserId ?? '').trim()
    if (!operatorUserId) return
    await switchAccount(operatorUserId, { then })
  }

  return { isPageAccount, operator, operatorLabel, switchingId, switchToOperator }
}
