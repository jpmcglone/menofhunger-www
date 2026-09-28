import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import Switcher from '~/components/app/AccountSwitcher.vue'

const spies = vi.hoisted(() => ({ switchTo: vi.fn(), refresh: vi.fn() }))
mockNuxtImport('useAccountSwitcher', () => () => ({
  accounts: ref([
    { id: 'me', name: 'Current Member', username: 'member', isCurrent: true },
    { id: 'page', name: 'My Page', username: 'page', isCurrent: false },
  ]),
  canSwitch: ref(true), switchingId: ref(null), ...spies,
}))


function src(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('account switcher menu', () => {
  it('dismisses the desktop popover and mobile more sheet from the switcher', () => {
    expect(src('components/app/UserCard.vue')).toContain('@close="closeMenu"')
    expect(src('components/app/TabBar.vue')).toContain('@close="moreOpen = false"')
  })
})


describe('collapsed account selector', () => {
  beforeEach(() => vi.clearAllMocks())
  async function mountSwitcher() {
    return mountSuspended(Switcher, {
      global: { stubs: { AppUserAvatar: true, AppAnimatedCount: true, Icon: true,
        Menu: { props: ['model'], data: () => ({ open: false }),
          methods: { toggle() { this.open = !this.open }, hide() { this.open = false } },
          template: '<div v-if="open"><button v-for="item in model" :key="item.account.id" @click="item.command()">{{ item.label }}</button></div>',
        },
      } },
    })
  }
  it('shows the current identity until opened and keeps selecting it a no-op', async () => {
    const wrapper = await mountSwitcher()
    expect(wrapper.text()).toContain('Current Member')
    expect(wrapper.text()).not.toContain('My Page')
    await wrapper.get('button[aria-label="Switch account"]').trigger('click')
    expect(wrapper.text()).toContain('My Page')
    await wrapper.findAll('button').find(button => button.text().includes('current account'))!.trigger('click')
    expect(spies.switchTo).not.toHaveBeenCalled()
    expect(wrapper.text()).not.toContain('My Page')
    wrapper.unmount()
  })
  it('closes the menu and requests the selected identity once', async () => {
    const wrapper = await mountSwitcher()
    await wrapper.get('button[aria-label="Switch account"]').trigger('click')
    await wrapper.findAll('button').find(button => button.text() === 'Switch to My Page')!.trigger('click')
    expect(spies.switchTo).toHaveBeenCalledExactlyOnceWith('page')
    expect(wrapper.text()).not.toContain('My Page')
    wrapper.unmount()
  })
})
