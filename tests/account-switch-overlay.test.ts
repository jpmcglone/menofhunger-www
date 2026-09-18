import { defineComponent, h, nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AccountSwitchOverlay from '~/components/app/AccountSwitchOverlay.vue'
import { useAccountSwitchState } from '~/composables/useAccountSwitchState'

let view: Awaited<ReturnType<typeof mountSuspended>> | undefined
afterEach(() => { view?.unmount(); vi.useRealTimers(); vi.restoreAllMocks() })

describe('account switch feedback', () => {
  it('opens a modal immediately, blocks dismissal, and offers reload only when navigation stalls', async () => {
    const show = vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function () {
      this.setAttribute('open', '')
    })
    let state!: ReturnType<typeof useAccountSwitchState>
    view = await mountSuspended(defineComponent({ setup() {
      state = useAccountSwitchState()
      state.transition.value = null
      return () => h(AccountSwitchOverlay)
    } }), {
      global: { stubs: { ClientOnly: { template: '<div><slot /></div>' }, AppIconGlyph: true } },
    })
    expect(view.find('dialog').exists()).toBe(false)
    vi.useFakeTimers()
    state.transition.value = { userId: 'page', label: 'News', destination: null }
    await nextTick()
    expect(show).toHaveBeenCalledTimes(1)
    expect(view.get('[role="status"]').text()).toBe('Switching to News…')
    const cancel = new Event('cancel', { cancelable: true })
    view.get('dialog').element.dispatchEvent(cancel)
    expect(cancel.defaultPrevented).toBe(true)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(view.find('button').exists()).toBe(false)
    state.transition.value = { ...state.transition.value, destination: '/home' }
    await nextTick()
    await vi.advanceTimersByTimeAsync(8_000)
    expect(view.get('button').text()).toContain('Reload page')
    const replace = vi.spyOn(window.location, 'replace').mockImplementation(() => {})
    await view.get('button').trigger('click')
    expect(replace).toHaveBeenCalledWith('/home')
    state.transition.value = null
    await nextTick()
    expect(view.find('dialog').exists()).toBe(false)
  })
})
