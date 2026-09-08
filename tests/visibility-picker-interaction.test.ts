import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import VisibilityPicker from '~/components/app/composer/VisibilityPicker.vue'

describe('composer audience selection', () => {
  const cleanups: Array<() => void> = []
  afterEach(() => {
    cleanups.forEach(cleanup => cleanup())
    cleanups.length = 0
    document.body.innerHTML = ''
  })

  async function mountPicker(viewerIsVerified = true) {
    const wrapper = await mountSuspended(VisibilityPicker, {
      props: {
        modelValue: 'public',
        allowed: ['public', 'verifiedOnly', 'premiumOnly'],
        viewerIsVerified,
        isPremium: true,
      },
      attachTo: document.body,
    })
    cleanups.push(() => wrapper.unmount())
    return wrapper
  }

  it('selects a teleported audience and updates both its name and badge', async () => {
    const wrapper = await mountPicker()
    const trigger = wrapper.get('button')
    expect(trigger.text()).toContain('Public')
    expect(trigger.get('use').attributes('href')).toContain('#globe-default')

    for (const [label, value, icon] of [
      ['Verified', 'verifiedOnly', 'badgeVerified'],
      ['Premium', 'premiumOnly', 'badgePremium'],
    ] as const) {
      await trigger.trigger('click')
      const option = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
        .find(button => button.textContent?.trim() === label)!
      option.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      option.click()
      await nextTick()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([value])
      expect(document.querySelector('[role="menu"]')).toBeNull()
      await wrapper.setProps({ modelValue: value })
      expect(trigger.text()).toContain(label)
      expect(trigger.get('use').attributes('href')).toContain(`#${icon}-default`)
    }
  })

  it('keeps the picker disabled for an unverified viewer', async () => {
    const wrapper = await mountPicker(false)
    const trigger = wrapper.get('button')
    expect(trigger.attributes('disabled')).toBeDefined()
    await trigger.trigger('click')
    expect(document.querySelector('[role="menu"]')).toBeNull()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
