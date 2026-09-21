import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function src(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('account switcher menu', () => {
  it('closes immediately on pick and opens own profile when already selected', () => {
    const switcher = src('components/app/AccountSwitcher.vue')
    expect(switcher).toContain("defineEmits<{ close: [] }>()")
    expect(switcher).toContain('emit(\'close\')')
    expect(switcher).toContain('openOwnProfileIfNeeded')
    expect(switcher).toContain('isOwnUserProfilePath(route.path, handle)')
    expect(switcher).not.toContain('account.isCurrent || Boolean(switchingId)')
  })

  it('dismisses the desktop popover and mobile more sheet from the switcher', () => {
    expect(src('components/app/UserCard.vue')).toContain('@close="closeMenu"')
    expect(src('components/app/TabBar.vue')).toContain('@close="moreOpen = false"')
  })
})
