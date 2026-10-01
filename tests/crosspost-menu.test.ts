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
      expect((wrapper.vm as unknown as { payload: () => unknown }).payload()).toEqual({})
      await toggle.setValue(true)
      expect((wrapper.vm as unknown as { payload: () => unknown }).payload()).toEqual({ pickax: 'native' })
      await wrapper.get('button[aria-label="Post on Pickax"]').trigger('click')
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

for (const id of ['pickax', 'x'] as const) {
  it(`defaults ${id} to Post and keeps allowance visible through Share and off`, async () => {
    const name = id === 'x' ? 'X' : 'Pickax'
    const allowanceNote = '40 posts left this month · up to 2 with links'
    const wrapper = await mountSuspended(Destinations, {
      attachTo: document.body,
      props: { destinations: [{ id, modes: ['link', 'native'], allowanceNote, nativeContainsLink: true }] },
      global: { stubs: { Icon: true, Transition: false } },
    })
    const payload = () => (wrapper.vm as unknown as { payload: () => unknown }).payload()
    try {
      expect(wrapper.text()).toContain(`Post on ${name}`)
      expect(wrapper.text()).toContain(allowanceNote)
      await wrapper.get('input').setValue(true)
      expect(payload()).toEqual({ [id]: 'native' })
      if (id === 'x') expect(wrapper.text()).toContain('Uses 1 post + 1 link')
      await wrapper.get('button').trigger('click')
      await vi.waitFor(() => expect(document.querySelector('[data-pc-name="menu"]')).not.toBeNull())
      const share = [...document.querySelectorAll<HTMLElement>('[data-pc-name="menu"] a')].find(a => a.textContent?.trim() === 'Share')!
      share.click()
      await vi.waitFor(() => expect(payload()).toEqual({ [id]: 'link' }))
      expect(wrapper.text()).toContain(`Share on ${name}`)
      expect(wrapper.text()).toContain(allowanceNote)
      expect(wrapper.get('button').html()).toContain('tabler:link')
      await wrapper.get('button').trigger('click')
      const off = [...document.querySelectorAll<HTMLElement>('[data-pc-name="menu"] a')].find(a => a.textContent?.trim() === "Don't share")!
      off.click()
      await vi.waitFor(() => expect(payload()).toEqual({}))
      expect(wrapper.text()).toContain(`Post on ${name}`)
      expect(wrapper.text()).toContain(allowanceNote)
    } finally { wrapper.unmount() }
  })
}

it('uses Share for link-only content and clears a selection when its allowance runs out', async () => {
  const wrapper = await mountSuspended(Destinations, {
    props: { destinations: [{ id: 'x', modes: ['link'], allowanceNote: '1 post left · 1 with links', linkOnlyReason: 'Articles share as a link on X' }] },
    global: { stubs: { Icon: true } },
  })
  try {
    expect(wrapper.text()).toContain('Share on X')
    expect(wrapper.text()).toContain('Articles share as a link on X')
    await wrapper.get('input').setValue(true)
    expect((wrapper.vm as unknown as { payload: () => unknown }).payload()).toEqual({ x: 'link' })
    await wrapper.setProps({ destinations: [{ id: 'x', modes: [], disabled: true, allowanceNote: '0 posts left · 0 with links', disabledNote: 'No links left' }] })
    expect((wrapper.vm as unknown as { payload: () => unknown }).payload()).toEqual({})
    expect(wrapper.text()).toContain('0 posts left · 0 with links')
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
  } finally { wrapper.unmount() }
})
