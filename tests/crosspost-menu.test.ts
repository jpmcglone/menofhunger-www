import { describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Destinations from '~/components/app/post/CrosspostDestinations.vue'
import { OVERLAY_LAYERS } from '~/utils/overlay-layers'

describe('cross-post choice menu', () => {
  it('opens above a dialog instead of staying hidden', async () => {
    const parent = document.createElement('div')
    parent.style.cssText = `position:fixed;z-index:${OVERLAY_LAYERS.modal};inset:0`
    document.body.append(parent)
    const wrapper = await mountSuspended(Destinations, {
      attachTo: parent,
      props: {
        destinations: [{ id: 'pickax', modes: ['link', 'native'] }],
      },
      global: { stubs: { Icon: true, Transition: false } },
    })
    try {
      const toggle = wrapper.get('input')
      await toggle.setValue(true)
      await wrapper.get('button[aria-label="Share on Pickax"]').trigger('click')
      await vi.waitFor(() => {
        const popup = document.querySelector<HTMLElement>('[data-pc-name="menu"]')
        expect(popup).not.toBeNull()
        expect(popup!.parentElement).toBe(document.body)
        expect(getComputedStyle(popup!).display).not.toBe('none')
        expect(Number(popup!.style.zIndex)).toBeGreaterThan(OVERLAY_LAYERS.modal)
        expect(popup!.textContent).toContain('Post')
        expect(popup!.textContent).toContain('Share')
        expect(popup!.textContent).toContain("Don't share")
      })
    } finally {
      wrapper.unmount()
      parent.remove()
      document.querySelector('[data-pc-name="menu"]')?.remove()
    }
  })
})
