import type { SwitchableAccount } from '~/types/api'

/** Overlay live socket counts onto a freshly fetched switcher list. */
export function mergeSwitchableAccountBadges(
  accounts: SwitchableAccount[],
  pending: Record<string, number>,
): SwitchableAccount[] {
  if (!accounts.length) return accounts
  const ids = Object.keys(pending)
  if (!ids.length) return accounts
  return accounts.map((account) => {
    if (!(account.id in pending)) return account
    return {
      ...account,
      unreadBadgeCount: Math.max(0, Math.floor(Number(pending[account.id]) || 0)),
    }
  })
}
