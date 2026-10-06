import type { SwitchableAccount } from '~/types/api'

/** Overlay live socket counts onto a freshly fetched switcher list. */
export function mergeSwitchableAccountBadges(
  accounts: SwitchableAccount[],
  pending: Record<string, number | Partial<Pick<SwitchableAccount, 'unreadBadgeCount' | 'hasUnreadNotifications'>>>,
): SwitchableAccount[] {
  if (!accounts.length) return accounts
  const ids = Object.keys(pending)
  if (!ids.length) return accounts
  return accounts.map((account) => {
    if (!(account.id in pending)) return account
    const patch = pending[account.id]
    return typeof patch === 'number'
      ? { ...account, unreadBadgeCount: Math.max(0, Math.floor(patch)) }
      : { ...account, ...patch }

  })
}
