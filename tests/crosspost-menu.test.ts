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
      expect(wrapper.emitted('change')?.at(-1)?.[0]).toEqual({})
      await toggle.setValue(true)
      expect(wrapper.emitted('change')?.at(-1)?.[0]).toEqual({ pickax: 'native' })
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

for (const id of ['pickax'] as const) {
  it(`defaults ${id} to Post and keeps allowance visible through Share and off`, async () => {
    const name = 'Pickax'
    const allowanceNote = '40 posts left this month · up to 2 with links'
    const wrapper = await mountSuspended(Destinations, {
      attachTo: document.body,
      props: { destinations: [{ id, modes: ['link', 'native'], allowanceNote }] },
      global: { stubs: { Icon: true, Transition: false } },
    })
    const payload = () => wrapper.emitted('change')?.at(-1)?.[0]
    try {
      expect(wrapper.text()).toContain(`Post on ${name}`)
      expect(wrapper.text()).toContain(allowanceNote)
      await wrapper.get('input').setValue(true)
      expect(payload()).toEqual({ [id]: 'native' })
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

it('uses only an on/off toggle for X, and clears an unsupported saved selection', async () => {
  const wrapper = await mountSuspended(Destinations, {
    props: { destinations: [{ id: 'x', modes: ['native'], allowanceNote: '40 posts left this month' }], initialSelection: { x: 'native' } },
    global: { stubs: { Icon: true } },
  })
  const payload = () => wrapper.emitted('change')?.at(-1)?.[0]
  try {
    expect(wrapper.text()).toContain('Post to X')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(payload()).toEqual({ x: 'native' })
    await wrapper.get('input').setValue(false)
    expect(payload()).toEqual({})
    await wrapper.get('input').setValue(true)
    expect(payload()).toEqual({ x: 'native' })
    expect(wrapper.find('button').exists()).toBe(false)
    await wrapper.setProps({ destinations: [{ id: 'x', modes: [], disabled: true, disabledNote: 'Remove any links to post to X.' }] })
    expect(payload()).toEqual({})
    expect(wrapper.text()).toContain('Remove any links')
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    await wrapper.setProps({ destinations: [{ id: 'x', modes: ['native'] }] })
    expect(payload()).toEqual({})
  } finally { wrapper.unmount() }
})

it('retains an explicitly offered X Article link choice', async () => {
  const wrapper = await mountSuspended(Destinations, {
    props: { destinations: [{ id: 'x', modes: ['link'] }] }, global: { stubs: { Icon: true } },
  })
  try {
    await wrapper.get('input').setValue(true)
    expect(wrapper.emitted('change')?.at(-1)?.[0]).toEqual({ x: 'link' })
    expect(wrapper.text()).toContain('A link back')
  } finally { wrapper.unmount() }
})
