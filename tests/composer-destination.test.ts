import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DestinationPicker from '../components/app/composer/DestinationPicker.vue'

const SelectionRow = defineComponent({
  props: ['label', 'locked', 'selected'],
  emits: ['select'],
  setup: (props, { emit }) => () => h('button', {
    disabled: props.locked,
    'aria-pressed': props.selected,
    onClick: () => emit('select'),
  }, props.label),
})
function picker(groupId: string | null = null) {
  return mount(DestinationPicker, {
    props: {
      modelValue: groupId, visibility: 'public', allowed: ['public', 'verifiedOnly', 'premiumOnly'],
      isPremium: false, groups: [{ id: 'group-1', name: 'Daily Practice', joinPolicy: 'closed' }],
    },
    global: { stubs: {
      AppComposerSelectionDialog: defineComponent({
        props: ['modelValue'],
        setup: (props, { slots }) => () => props.modelValue ? h('section', slots.default?.()) : null,
      }),
      AppComposerSelectionRow: SelectionRow, Icon: true, AppIconGlyph: true, AppGroupsGroupAvatar: true,
      InputText: true, NuxtLink: true,
    } },
  })
}
describe('composer destinations', () => {
  it('keeps the selected group visible and lets the member return to a feed audience', async () => {
    const wrapper = picker('group-1')
    expect(wrapper.get('button').text()).toContain('Daily Practice')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
    expect(wrapper.find('[role="tab"][aria-selected="true"]').text()).toBe('Group')
    await wrapper.findAll('[role="tab"]').find(tab => tab.text() === 'Feed')!.trigger('click')
    expect(wrapper.emitted('select-visibility')).toBeUndefined()
    const publicRow = wrapper.findAll('button').find(row => row.text() === 'Public')!
    expect(publicRow.attributes('aria-pressed')).toBe('false')
    await publicRow.trigger('click')
    expect(wrapper.emitted('select-visibility')).toEqual([['public']])
    expect(wrapper.find('section').exists()).toBe(false)
  })
  it('supports keyboard category changes without changing the destination', async () => {
    const wrapper = picker()
    await wrapper.get('button').trigger('click')
    const feed = wrapper.findAll('[role="tab"]').find(tab => tab.text() === 'Feed')!
    await feed.trigger('keydown', { key: 'ArrowRight' })
    const group = wrapper.findAll('[role="tab"]').find(tab => tab.text() === 'Group')!
    expect(group.attributes('aria-selected')).toBe('true')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('select-visibility')).toBeUndefined()
    await group.trigger('keydown', { key: 'Home' })
    expect(feed.attributes('aria-selected')).toBe('true')
  })
  it('preserves premium locks and group selection in the same picker', async () => {
    const wrapper = picker()
    await wrapper.get('button').trigger('click')
    const premium = wrapper.findAll('button').find(row => row.text() === 'Premium')!
    expect(premium.attributes('disabled')).toBeDefined()
    await premium.trigger('click')
    expect(wrapper.emitted('select-visibility')).toBeUndefined()
    await wrapper.findAll('[role="tab"]').find(tab => tab.text() === 'Group')!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.findAll('button').find(row => row.text() === 'Daily Practice')!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['group-1']])
    expect(wrapper.find('section').exists()).toBe(false)
  })
})
