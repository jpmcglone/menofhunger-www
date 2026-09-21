import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineComponent, h, nextTick } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AccountSwitchOverlay from '~/components/app/AccountSwitchOverlay.vue'
import { useAccountSwitchState } from '~/composables/useAccountSwitchState'

const overlaySource = readFileSync(
  resolve(__dirname, '../components/app/AccountSwitchOverlay.vue'),
  'utf8',
)

let view: Awaited<ReturnType<typeof mountSuspended>> | undefined
afterEach(() => { view?.unmount(); vi.useRealTimers(); vi.restoreAllMocks() })

describe('account switch feedback', () => {
  it('opens a modal immediately, blocks dismissal, and offers reload only when navigation stalls', async () => {
    const show = vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (this: HTMLDialogElement) {
      this.setAttribute('open', '')
    })
    let state!: ReturnType<typeof useAccountSwitchState>
    view = await mountSuspended(defineComponent({ setup() {
      state = useAccountSwitchState()
      state.transition.value = null
      return () => h(AccountSwitchOverlay)
    } }), {
      global: {
        stubs: {
          ClientOnly: { template: '<div><slot /></div>' },
          AppIconGlyph: true,
          AppAvatarCircle: {
            props: ['sizeClass'],
            template: '<div :class="sizeClass" />',
          },
          Button: { props: ['label'], template: '<button>{{ label }}</button>' },
        },
      },
    })
    expect(view.find('dialog').exists()).toBe(false)
    vi.useFakeTimers()
    state.transition.value = { userId: 'page', label: 'News' }
    await nextTick()
    expect(show).toHaveBeenCalledTimes(1)
    expect(view.get('[role="status"]').text()).toBe('Switching to News…')
    expect(view.find('.h-28.w-28').exists()).toBe(true)
    const cancel = new Event('cancel', { cancelable: true })
    view.get('dialog').element.dispatchEvent(cancel)
    expect(cancel.defaultPrevented).toBe(true)
    expect(view.find('button').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(8_000)
    expect(view.get('button').text()).toContain('Reload page')
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {})
    await view.get('button').trigger('click')
    expect(reload).toHaveBeenCalledTimes(1)
    state.transition.value = null
    await nextTick()
    await vi.advanceTimersByTimeAsync(250)
    await nextTick()
    expect(view.find('dialog').exists()).toBe(false)
  })

  it('fades the frosted overlay in and out', () => {
    expect(overlaySource).toContain('<Transition name="account-switch"')
    expect(overlaySource).toContain('backdrop-filter: blur(20px)')
    expect(overlaySource).toContain('opacity 200ms ease')
    expect(overlaySource).toContain('prefers-reduced-motion')
  })
})
