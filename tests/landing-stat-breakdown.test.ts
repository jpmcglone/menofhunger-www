import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LandingStatBreakdown from '../components/app/LandingStatBreakdown.vue'

const { overlay } = vi.hoisted(() => ({ overlay: vi.fn() }))
mockNuxtImport('useOverlayDismiss', () => overlay)

const wrappers: ReturnType<typeof mount>[] = []
function render() {
  const wrapper = mount(LandingStatBreakdown, {
    attachTo: document.body,
    props: {
      title: '1,234 posts', subtitle: 'Originals, replies, and audience', triggerLabel: 'Show posts breakdown',
      sections: [
        [{ key: 'original', label: 'Originals', count: 1234 }, { key: 'hidden', label: 'Hidden zero', count: 0 }],
        [{ key: 'share', label: 'Top author', count: 32.6, format: 'percent' }, { key: 'replies', label: 'Replies', count: 0, keepZero: true }],
      ],
    },
    slots: { default: '1.2K+ posts' },
    global: { stubs: { Icon: true } },
  })
  wrappers.push(wrapper)
  return wrapper
}
function panel() { return document.querySelector<HTMLElement>('[role="dialog"]') }

afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
  overlay.mockClear()
})

describe('landing statistics details', () => {
  it('opens from activation, preserves exact counts and percent/zero rules, and restores focus on close', async () => {
    const wrapper = render()
    const trigger = wrapper.get('button')
    expect(panel()).toBeNull()
    await trigger.trigger('click')
    await nextTick()
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(panel()?.textContent).toContain('1,234')
    expect(panel()?.textContent).toContain('33%')
    expect(panel()?.textContent).toContain('Replies0')
    expect(panel()?.textContent).not.toContain('Hidden zero')
    const close = panel()!.querySelector<HTMLButtonElement>('button')!
    expect(document.activeElement).toBe(close)
    close.click()
    await nextTick()
    expect(panel()).toBeNull()
    expect(document.activeElement).toBe(trigger.element)
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('lets a mouse cross into the preview, then pins it on click until dismissed', async () => {
    vi.useFakeTimers()
    const wrapper = render()
    const trigger = wrapper.get('button')
    await trigger.trigger('pointerenter', { pointerType: 'mouse' })
    expect(panel()).not.toBeNull()
    await trigger.trigger('pointerleave', { pointerType: 'mouse' })
    panel()!.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    await vi.advanceTimersByTimeAsync(200)
    expect(panel()).not.toBeNull()
    await trigger.trigger('click')
    await trigger.trigger('pointerleave', { pointerType: 'mouse' })
    await vi.advanceTimersByTimeAsync(200)
    expect(panel()).not.toBeNull()
    // The shared Escape/Back dismiss stack receives the pinned panel.
    const [active, dismiss] = overlay.mock.calls[0]!
    expect(active.value).toBe(true)
    dismiss()
    await nextTick()
    expect(panel()).toBeNull()
  })

  it('ignores touch hover and closes on an outside tap or focus leaving the panel', async () => {
    const wrapper = render()
    const trigger = wrapper.get('button')
    await trigger.trigger('pointerenter', { pointerType: 'touch' })
    expect(panel()).toBeNull()
    await trigger.trigger('click')
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' }))
    await nextTick()
    expect(panel()).toBeNull()
    await trigger.trigger('click')
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    outside.focus()
    await nextTick()
    expect(panel()).toBeNull()
    outside.remove()
  })
})
