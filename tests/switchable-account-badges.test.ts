import { describe, expect, it } from 'vitest'
import type { SwitchableAccount } from '~/types/api'
import { mergeSwitchableAccountBadges } from '~/utils/switchable-account-badges'

function account(partial: Partial<SwitchableAccount> & { id: string }): SwitchableAccount {
  return {
    username: partial.username ?? partial.id,
    name: partial.name ?? partial.id,
    avatarUrl: partial.avatarUrl ?? null,
    accountKind: partial.accountKind ?? 'person',
    isOrganization: partial.isOrganization ?? false,
    isCurrent: partial.isCurrent ?? false,
    unreadBadgeCount: partial.unreadBadgeCount ?? 0,
    ...partial,
  }
}

describe('mergeSwitchableAccountBadges', () => {
  it('leaves the list alone when there are no pending patches', () => {
    const accounts = [account({ id: 'john', unreadBadgeCount: 2 })]
    expect(mergeSwitchableAccountBadges(accounts, {})).toEqual(accounts)
  })

  it('applies pending counts onto matching ids and ignores unknown ids', () => {
    const accounts = [
      account({ id: 'john', unreadBadgeCount: 1 }),
      account({ id: 'page', accountKind: 'page', unreadBadgeCount: 0 }),
    ]
    expect(
      mergeSwitchableAccountBadges(accounts, { page: 4, stranger: 9 }),
    ).toEqual([
      account({ id: 'john', unreadBadgeCount: 1 }),
      account({ id: 'page', accountKind: 'page', unreadBadgeCount: 4 }),
    ])
  })

  it('can zero a previously unread identity', () => {
    const accounts = [account({ id: 'page', unreadBadgeCount: 6 })]
    expect(mergeSwitchableAccountBadges(accounts, { page: 0 })).toEqual([
      account({ id: 'page', unreadBadgeCount: 0 }),
    ])
  })
})
