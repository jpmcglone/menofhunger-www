import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { useMenuPosition } from '../composables/useMenuPosition'

describe('bottom-anchored account popover', () => {
  it('stays above its trigger as content grows, reclamps on resize, and cleans up', async () => {
    let menu!: ReturnType<typeof useMenuPosition>
    const wrapper = mount(defineComponent({ setup() { menu = useMenuPosition(); return () => h('div') } }))
    let top = 700
    const anchor = document.createElement('button')
    anchor.getBoundingClientRect = () => ({ top, bottom: top + 60, left: 20, right: 300, width: 280, height: 60 }) as DOMRect
    vi.stubGlobal('innerHeight', 800)
    vi.stubGlobal('innerWidth', 1000)
    menu.place(anchor, { placement: 'above', gap: 8, menuWidth: 288, trackViewport: true })
    await nextTick()
    expect(menu.style.value).toMatchObject({ bottom: '108px', maxHeight: '684px', left: '20px' })
    expect(menu.style.value.top).toBeUndefined()
    // Content taller than the available space cannot move the anchored bottom edge.
    const panel = document.createElement('div')
    panel.getBoundingClientRect = () => ({ width: 288, height: 1200 }) as DOMRect
    menu.menuEl.value = panel
    menu.remeasure()
    expect(menu.style.value).toMatchObject({ bottom: '108px', maxHeight: '684px' })
    top = 320
    vi.stubGlobal('innerHeight', 420)
    window.dispatchEvent(new Event('resize'))
    expect(menu.style.value).toMatchObject({ bottom: '108px', maxHeight: '304px' })
    wrapper.unmount()
    window.dispatchEvent(new Event('resize'))
    expect(menu.style.value).toEqual({})
    vi.unstubAllGlobals()
  })
})
