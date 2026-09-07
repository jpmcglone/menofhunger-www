import { nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ViewerBreakdown from '../components/app/post/PostRowViewerBreakdown.vue'
import WotdLikeButton from '../components/app/WotdLikeButton.vue'

const { apiFetchData } = vi.hoisted(() => ({ apiFetchData: vi.fn() }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData }))
mockNuxtImport('useAuth', () => () => ({ isAuthed: ref(true) }))

const wrappers: ReturnType<typeof mount>[] = []
const global = { stubs: { Icon: true, AppAnimatedCount: { props: ['value'], template: '<span>{{ Number(value).toLocaleString("en-US") }}</span>' } } }
const data = {
  total: 1205, totalViewCount: 2410,
  premium: 1000, premiumTotal: 2000,
  verified: 200, verifiedTotal: 400,
  unverified: 0, unverifiedTotal: 0,
  guest: 5, guestTotal: 10,
}
function renderViews(peopleVerb = 'saw this') {
  const wrapper = mount(ViewerBreakdown, {
    attachTo: document.body, global,
    props: { entityId: 'post-1', breakdownPath: '/posts/post-1/views/breakdown', viewerCount: 100, totalViewCount: 200, peopleVerb },
  })
  wrappers.push(wrapper)
  return wrapper
}
function panel() { return document.querySelector<HTMLElement>('[role="dialog"]') }

beforeEach(() => { apiFetchData.mockReset() })
afterEach(() => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount())
  vi.useRealTimers()
})

describe('count breakdown panels', () => {
  it.each(['saw this', 'read this'])('preserves exact unique and total views for people who %s', async (verb) => {
    apiFetchData.mockResolvedValue(data)
    const wrapper = renderViews(verb)
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(apiFetchData).toHaveBeenCalledWith('/posts/post-1/views/breakdown')
    expect(panel()?.textContent).toContain('2,410 total views')
    expect(panel()?.textContent).toContain(`1,205 people ${verb}`)
    expect(panel()?.querySelector('[aria-label="1,000 people, 2,000 total views"]')).not.toBeNull()
    expect(panel()?.textContent).not.toContain('Unverified')
    expect(wrapper.emitted('countSynced')).toEqual([[{ viewerCount: 1205, totalViewCount: 2410 }]])
  })

  it('keeps the view panel open while crossing the gap and restores focus after closing', async () => {
    vi.useFakeTimers()
    apiFetchData.mockResolvedValue(data)
    const wrapper = renderViews()
    const trigger = wrapper.get('button')
    await trigger.trigger('mouseenter')
    await trigger.trigger('mouseleave')
    panel()!.dispatchEvent(new MouseEvent('mouseenter'))
    await vi.advanceTimersByTimeAsync(200)
    expect(panel()).not.toBeNull()
    const close = panel()!.querySelector<HTMLButtonElement>('button')!
    close.focus()
    close.click()
    await nextTick()
    expect(panel()).toBeNull()
    expect(document.activeElement).toBe(trigger.element)
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('reports a failed fetch and lets a later activation retry, then dismisses outside', async () => {
    apiFetchData.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(data)
    const wrapper = renderViews()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(panel()?.querySelector('[role="status"]')?.textContent).toContain("Couldn't load")
    await wrapper.get('button').trigger('keydown', { key: 'Escape' })
    expect(panel()).toBeNull()
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(panel()?.textContent).toContain('2,410 total views')
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await nextTick()
    expect(panel()).toBeNull()
  })

  it('shows membership likes while preserving the optimistic like action', async () => {
    apiFetchData.mockImplementation((path: string) => Promise.resolve(path.endsWith('/breakdown')
      ? { premium: 2, verified: 1, unverified: 0 }
      : { liked: true, likeCount: 4 }))
    const wrapper = mount(WotdLikeButton, { attachTo: document.body, global, props: { initialCount: 3, initialLiked: false } })
    wrappers.push(wrapper)
    const trigger = wrapper.get('button')
    await trigger.trigger('mouseenter')
    await flushPromises()
    expect(panel()?.textContent).toContain('3 likes')
    expect(panel()?.textContent).toContain('Premium2')
    expect(panel()?.textContent).not.toContain('Unverified')
    await trigger.trigger('click')
    await flushPromises()
    expect(apiFetchData).toHaveBeenCalledWith('/meta/websters1828/wotd/like', { method: 'POST' })
    expect(wrapper.emitted('like-toggled')).toEqual([[{ liked: true, likeCount: 4 }]])
    expect(trigger.attributes('aria-pressed')).toBe('true')
    panel()!.querySelector<HTMLButtonElement>('button')!.click()
    await nextTick()
    expect(panel()).toBeNull()
    expect(document.activeElement).toBe(trigger.element)
  })
})
