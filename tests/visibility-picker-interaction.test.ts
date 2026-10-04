import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import VisibilityPicker from '~/components/app/composer/VisibilityPicker.vue'
import DestinationPicker from '~/components/app/composer/DestinationPicker.vue'
import SelectionRow from '~/components/app/composer/SelectionRow.vue'

describe('independent visibility dialog', () => {
  const cleanups: Array<() => void> = []
  afterEach(() => { cleanups.splice(0).forEach(fn => fn()); document.body.innerHTML = '' })
  async function mountPicker(viewerIsVerified = true, isPremium = true) {
    const wrapper = await mountSuspended(VisibilityPicker, {
      props: { modelValue: 'public', allowed: ['public', 'verifiedOnly', 'premiumOnly', 'onlyMe'], viewerIsVerified, isPremium },
      attachTo: document.body,
    })
    cleanups.push(() => wrapper.unmount())
    return wrapper
  }
  it('puts core visibility first and selects a teleported option without outside-click interference', async () => {
    const wrapper = await mountPicker()
    await wrapper.get('button').trigger('click')
    const rows = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .filter(button => ['Public', 'Verified', 'Premium', 'Only me'].some(label => button.textContent?.includes(label)))
    expect(rows).toHaveLength(4)
    expect(rows[0]!.textContent).toContain('Public')
    rows[1]!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    rows[1]!.click()
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toEqual([['verifiedOnly']])
    await wrapper.setProps({ modelValue: 'verifiedOnly' })
    expect(wrapper.get('button').text()).toContain('Verified')
  })
  it('prevents selecting premium when the tier is locked', async () => {
    const wrapper = await mountPicker(true, false)
    await wrapper.get('button').trigger('click')
    const premium = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .find(button => button.textContent?.includes('Premium'))!
    expect(premium.disabled).toBe(true)
    premium.click()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
  it('keeps the picker disabled for an unverified viewer', async () => {
    const wrapper = await mountPicker(false)
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
  it('colors destination audiences and selects Only me from the real dialog', async () => {
    const wrapper = await mountSuspended(DestinationPicker, {
      props: {
        modelValue: null, visibility: 'public', groups: [], isPremium: true,
        allowed: ['public', 'verifiedOnly', 'premiumOnly', 'onlyMe'],
      },
      attachTo: document.body,
    })
    cleanups.push(() => wrapper.unmount())
    await wrapper.get('button').trigger('click')
    const rows = wrapper.findAllComponents(SelectionRow)
    expect(rows.map(row => [row.props('label'), row.props('color')])).toEqual([
      ['Public', undefined], ['Verified', 'var(--moh-verified)'],
      ['Premium', 'var(--moh-premium)'], ['Only me', 'var(--moh-onlyme)'],
    ])
    const onlyMe = [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .find(button => button.textContent?.includes('Only me'))!
    expect(onlyMe.disabled).toBe(false)
    expect(onlyMe.querySelector('[style]')?.getAttribute('style')).toContain('var(--moh-onlyme)')
    onlyMe.click()
    await nextTick()
    expect(wrapper.emitted('select-visibility')).toEqual([['onlyMe']])
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
    await wrapper.setProps({ visibility: 'onlyMe' })
    expect(wrapper.get('button').text()).toContain('Only me')
  })
})
