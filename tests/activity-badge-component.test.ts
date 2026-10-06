import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import ActivityBadge from '~/components/app/ActivityBadge.vue'

const tone = ref('moh-notif-badge-verified')
mockNuxtImport('useActivityBadgeTone', () => () => tone)

describe('ActivityBadge rendering', () => {
  it('renders an accessible count, then an unread dot, then nothing', async () => {
    const wrapper = await mountSuspended(ActivityBadge, {
      props: { count: 2, hasUnread: true, countLabel: 'unseen notifications' },
      global: { stubs: { AppAnimatedCount: { props: ['value'], template: '<span>{{ value }}</span>' } } },
    })
    expect(wrapper.attributes('aria-label')).toBe('2 unseen notifications')
    expect(wrapper.text()).toBe('2')
    await wrapper.setProps({ count: 0 })
    expect(wrapper.attributes('aria-label')).toBe('Unread notifications')
    expect(wrapper.text()).toBe('')
    tone.value = 'moh-notif-badge-organization'
    await wrapper.vm.$nextTick()
    expect(wrapper.classes()).toContain('moh-notif-badge-organization')
    await wrapper.setProps({ hasUnread: false })
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    wrapper.unmount()
  })
})
