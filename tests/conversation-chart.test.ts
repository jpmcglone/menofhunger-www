import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ConversationChart from '~/components/app/ConversationChart.vue'

describe('Conversation chart', () => {
  it('selects a day without combining coin amounts with conversation counts', async () => {
    const wrapper = await mountSuspended(ConversationChart, { props: { days: [
      { date: '2026-09-01', replies: 2, reposts: 1, coins: 100, branches: 1 },
      { date: '2026-09-02', replies: 3, reposts: 0, coins: 0, branches: 2 },
    ] } })
    expect(wrapper.text()).toContain('5 replies')
    expect(wrapper.text()).toContain('100 coins')
    const days = wrapper.findAll('button')
    await days[1]!.trigger('click')
    expect(wrapper.text()).toContain('3 replies')
    expect(wrapper.text()).toContain('0 coins')
    expect(days[1]!.attributes('aria-pressed')).toBe('true')
    await wrapper.findAll('button').at(-1)!.trigger('click')
    expect(wrapper.text()).toContain('5 replies')
  })
})
