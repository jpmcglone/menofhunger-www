import { defineComponent, h, ref, toValue } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SharePostDialog from '../components/app/SharePostDialog.vue'
import type { FeedPost } from '../types/api'

const spies = vi.hoisted(() => ({ overlay: vi.fn(), lock: vi.fn(), share: vi.fn(), copy: vi.fn(), ensure: vi.fn(), refresh: vi.fn(), toast: vi.fn() }))
mockNuxtImport('useAuth', () => () => ({ user: ref({ id: 'member', checkinStreakDays: 3 }) }))
mockNuxtImport('useOverlayDismiss', () => spies.overlay)
mockNuxtImport('useScrollLock', () => spies.lock)
mockNuxtImport('useAppToast', () => () => ({ push: spies.toast }))
mockNuxtImport('useWebShare', () => () => ({ share: spies.share, isSupported: ref(true) }))
mockNuxtImport('useCopyToClipboard', () => () => ({ copyText: spies.copy }))
mockNuxtImport('useEnsureReferralCode', () => () => ({ referralCode: ref(null), ensureReferralCode: spies.ensure }))
mockNuxtImport('useDailyCheckin', () => () => ({ state: ref({ socialProof: { totalToday: 2 } }), refresh: spies.refresh }))
const post = { id: 'checkin-test', kind: 'checkin', body: 'Showed up today.', visibility: 'public', checkinDayKey: '2026-09-06', author: { id: 'member', username: 'member' }, media: [] } as unknown as FeedPost
function render(kind: 'checkin' | 'regular' = 'checkin') {
  return mount(SharePostDialog, { props: { open: true, post: { ...post, kind } }, global: { stubs: {
    ClientOnly: defineComponent({ setup(_, { slots }) { return () => slots.default?.() } }),
    Teleport: true,
    AppEmbeddedPostPreview: true,
    Icon: true,
    NuxtLink: defineComponent({ props: ['to'], setup(props, { slots }) { return () => h('a', { href: props.to }, slots.default?.()) } }),
  } } })
}
beforeEach(() => { vi.clearAllMocks(); spies.share.mockResolvedValue(false); spies.copy.mockResolvedValue(undefined); spies.ensure.mockResolvedValue(undefined) })
describe('check-in confirmation', () => {
  it('is a nonmodal region that does not lock scrolling or intercept browser Back', () => {
    const wrapper = render()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('[role="region"]').attributes('aria-modal')).toBeUndefined()
    expect(wrapper.get('[role="status"]').text()).toContain('3-day streak')
    expect(toValue(spies.lock.mock.calls[0]![0])).toBe(false)
    expect(toValue(spies.overlay.mock.calls[0]![0])).toBe(false)
    wrapper.unmount()
  })
  it('keeps ordinary post sharing modal', () => {
    const wrapper = render('regular')
    expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(toValue(spies.lock.mock.calls[0]![0])).toBe(true)
    expect(toValue(spies.overlay.mock.calls[0]![0])).toBe(true)
    wrapper.unmount()
  })
  it('stays available when native sharing is cancelled, then closes after copying', async () => {
    const wrapper = render()
    await wrapper.findAll('button').find(button => button.text() === 'Share')!.trigger('click')
    await flushPromises()
    expect(spies.share).toHaveBeenCalledOnce()
    expect(wrapper.emitted('update:open')).toBeUndefined()
    await wrapper.findAll('button').find(button => button.text() === 'Copy link')!.trigger('click')
    await flushPromises()
    expect(spies.copy).toHaveBeenCalledWith(expect.stringContaining('/p/checkin-test'))
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    wrapper.unmount()
  })
  it('has a close button and a real link to the day’s answers', async () => {
    const wrapper = render()
    expect(wrapper.get('a').attributes('href')).toBe('/check-ins/day/2026-09-06')
    await wrapper.get('button[aria-label="Close"]').trigger('click')
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    wrapper.unmount()
  })
})
