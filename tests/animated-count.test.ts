import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AnimatedCount from '~/components/app/AnimatedCount.vue'

describe('AppAnimatedCount', () => {
  it('holds its space as a blank at 0, then rolls in the number', async () => {
    const wrapper = mount(AnimatedCount, { props: { value: 0, blankZero: true } })
    expect(wrapper.element.textContent).toBe('\u00A0')

    await wrapper.setProps({ value: 3 })
    expect(wrapper.text()).toContain('3')
  })

  it('shows 0 as a digit when blank-zero is off', () => {
    expect(mount(AnimatedCount, { props: { value: 0 } }).text()).toBe('0')
  })
})
