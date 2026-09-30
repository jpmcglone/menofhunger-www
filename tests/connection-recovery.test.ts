import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import ConnectionBanners from '~/components/app/layout/ConnectionBanners.vue'

const spies = vi.hoisted(() => ({ fetchMe: vi.fn() }))
mockNuxtImport('useAuth', () => () => ({ me: spies.fetchMe, apiUnreachable: ref(true) }))
mockNuxtImport('useAppNav', () => () => ({ isAuthed: ref(false) }))
mockNuxtImport('usePresence', () => () => ({
  disconnectedDueToIdle: ref(false), socketDisconnectedWhileVisible: ref(false), wasSocketConnectedOnce: ref(false),
  isSocketConnected: ref(false), connectionBarJustConnected: ref(false), isSocketConnecting: ref(false), reconnect: vi.fn(),
}))

describe('blocking connection recovery', () => {
  it('keeps retries single-flight, preserves status navigation, and restores focus and scroll on exit', async () => {
    let finish: (() => void) | undefined
    spies.fetchMe.mockImplementation(() => new Promise<void>(resolve => { finish = resolve }))
    const previousOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'clip'
    const previousControl = document.createElement('button')
    document.body.append(previousControl)
    previousControl.focus()
    const wrapper = await mountSuspended(ConnectionBanners, { attachTo: document.body })
    try {
      expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
      expect(wrapper.get('a[href="/status"]').text()).toBe('Check status')
      expect(document.documentElement.style.overflow).toBe('hidden')
      const retry = wrapper.get('button')
      await retry.trigger('click')
      await retry.trigger('click')
      expect(spies.fetchMe).toHaveBeenCalledTimes(1)
      expect(retry.attributes('disabled')).toBeDefined()
      expect(retry.text()).toBe('Trying again…')
      finish?.()
      await flushPromises()
      expect(retry.attributes('disabled')).toBeUndefined()
      expect(wrapper.text()).toContain('Let’s reconnect')
    } finally {
      wrapper.unmount()
      expect(document.documentElement.style.overflow).toBe('clip')
      expect(document.activeElement).toBe(previousControl)
      previousControl.remove()
      document.documentElement.style.overflow = previousOverflow
    }
  })
})
