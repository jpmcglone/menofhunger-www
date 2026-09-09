import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DailyCheckinCard from '../components/app/feed/DailyCheckinCard.vue'

afterEach(() => { vi.useRealTimers() })

function render() {
  return mount(DailyCheckinCard, {
    props: { prompt: 'What did you learn today?', streak: 3 },
    global: { renderStubDefaultSlot: true, stubs: { Icon: true, NuxtLink: true, AppInlineAlert: true } },
  })
}

describe('check-in window UI', () => {
  it('replaces the daytime notice with the answer action at 5pm without a reload', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-07T20:59:59Z'))
    const wrapper = render()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Check-ins open at 5pm ET')
    expect(wrapper.find('button').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.text()).toContain('What did you learn today?')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('check-in')).toHaveLength(1)
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('closes exactly at midnight even if the previous state was answered', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-08T03:59:59Z'))
    const wrapper = render()
    await wrapper.setProps({ hasCheckedInToday: true })
    expect(wrapper.text()).toContain('Check-in answered')
    expect(wrapper.text()).toContain('Day 3')
    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.text()).toContain('Check-ins open at 5pm ET')
    expect(wrapper.text()).not.toContain('Check-in answered')
    wrapper.unmount()
  })

  it('resynchronizes after a sleeping tab returns', async () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-09-07T20:00:00Z'))
    const wrapper = render()
    vi.setSystemTime(new Date('2026-09-07T22:00:00Z'))
    window.dispatchEvent(new Event('focus'))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('button').exists()).toBe(true)
    wrapper.unmount()
  })
})
