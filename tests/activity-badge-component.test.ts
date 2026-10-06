import { ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import ActivityBadge from '~/components/app/ActivityBadge.vue'

const tone = ref('moh-notif-badge-verified')
mockNuxtImport('useActivityBadgeTone', () => () => tone)

const stubs = { AppAnimatedCount: { props: ['value'], template: '<span>{{ value }}</span>' } }

describe('ActivityBadge rendering', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('morphs a count into a dot, then removes the badge', async () => {
    const wrapper = await mountSuspended(ActivityBadge, {
      props: { count: 2, hasUnread: true, countLabel: 'unseen notifications' },
      global: { stubs },
    })
    const badge = () => wrapper.find('[role="status"]')
    expect(badge().attributes('aria-label')).toBe('2 unseen notifications')
    expect(badge().classes()).toContain('is-count')

    await wrapper.setProps({ count: 0 })
    expect(badge().find('.moh-activity-badge__content').classes()).toContain('is-hidden')
    expect(badge().classes()).toContain('is-count')
    await vi.advanceTimersByTimeAsync(200)
    expect(badge().classes()).toContain('is-dot')
    expect(badge().attributes('aria-label')).toBe('Unread notifications')

    tone.value = 'moh-notif-badge-organization'
    await wrapper.vm.$nextTick()
    expect(badge().classes()).toContain('moh-notif-badge-organization')

    await wrapper.setProps({ count: 3 })
    expect(badge().classes()).toContain('is-count')
    await vi.advanceTimersByTimeAsync(200)
    expect(badge().find('.moh-activity-badge__content').classes()).not.toContain('is-hidden')

    await wrapper.setProps({ count: 0, hasUnread: false })
    await vi.advanceTimersByTimeAsync(10)
    expect(badge().exists()).toBe(false)
    wrapper.unmount()
  })
})
