import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import GroupAudiencePicker from '~/components/app/composer/GroupAudiencePicker.vue'

describe('group destination dialog', () => {
  const cleanups: Array<() => void> = []
  afterEach(() => { cleanups.splice(0).forEach(fn => fn()); document.body.innerHTML = '' })
  async function mountPicker(extra = {}) {
    const wrapper = await mountSuspended(GroupAudiencePicker, {
      props: { modelValue: 'g1', groups: [
        { id: 'g1', name: 'Morning Men', joinPolicy: 'open' },
        { id: 'g2', name: 'Quiet Work', joinPolicy: 'approval' },
      ], ...extra }, attachTo: document.body,
    })
    cleanups.push(() => wrapper.unmount())
    await wrapper.get('button').trigger('click')
    await nextTick()
    return wrapper
  }
  function button(label: string) {
    return [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .find(el => el.textContent?.includes(label))!
  }
  it('searches joined groups and selects an option in the teleported dialog', async () => {
    const wrapper = await mountPicker()
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Search your groups"]')!
    input.value = 'quiet'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()
    expect(button('Morning Men')).toBeUndefined()
    button('Quiet Work').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    button('Quiet Work').click()
    await nextTick()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['g2'])
  })
  it('removes the group without assigning a new feed visibility', async () => {
    const wrapper = await mountPicker()
    button('No group').click()
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
  })
  it('retains cached groups during a failed refresh and lets the user retry', async () => {
    const wrapper = await mountPicker({ error: 'Could not refresh' })
    expect(button('Quiet Work')).toBeDefined()
    button('Try again').click()
    await nextTick()
    expect(wrapper.emitted('open')?.length).toBe(2)
  })
  it('keeps the chat handoff available while a group is selected', async () => {
    const wrapper = await mountPicker({ showsChat: true })
    button('Chat').click()
    await nextTick()
    expect(wrapper.emitted('select-chat')).toHaveLength(1)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})
