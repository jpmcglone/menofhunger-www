import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import ActionBar from '../components/app/composer/ActionBar.vue'

describe('composer header action', () => {
  afterEach(() => { document.body.innerHTML = '' })

  it('moves the same working submit control to the header and back without duplicating it', async () => {
    const target = document.createElement('div')
    document.body.append(target)
    const submit = vi.fn()
    const wrapper = mount(ActionBar, {
      attachTo: document.body,
      slots: {
        tools: () => h('button', 'Add media'),
        count: () => h('span', '444/500'),
        submit: () => h('button', { onClick: submit }, 'Reply'),
      },
    })
    const button = wrapper.find('.composer-submit button').element as HTMLButtonElement
    await wrapper.setProps({ submitTarget: target })
    expect(target.querySelector('button')).toBe(button)
    expect(wrapper.text()).toContain('Add media')
    expect(wrapper.text()).toContain('444/500')
    expect(wrapper.find('.composer-submit').exists()).toBe(false)
    button.click()
    expect(submit).toHaveBeenCalledTimes(1)
    await wrapper.setProps({ submitTarget: null })
    expect(target.childElementCount).toBe(0)
    expect(wrapper.find('.composer-submit button').element).toBe(button)
    wrapper.unmount()
    expect(document.body.querySelector('button')).toBeNull()
  })
})
