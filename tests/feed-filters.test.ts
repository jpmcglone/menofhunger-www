import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import FeedFilters from '~/components/app/FeedFiltersBar.vue'
import { feedScopeTint } from '~/utils/post-visibility'

const props = { sort: 'new' as const, filter: 'all' as const, viewerIsVerified: false, viewerIsPremium: false }
const global = { stubs: { Icon: true, Teleport: true } }
describe('feed filters', () => {
  it('uses the highest accessible tier only for all, and respects explicit scopes', () => {
    expect(feedScopeTint('all', { verified: true, premium: true })).toBe('var(--moh-premium)')
    expect(feedScopeTint('all', { verified: true, premium: false })).toBe('var(--moh-verified)')
    expect(feedScopeTint('all', { verified: false, premium: false })).toBe('var(--moh-text)')
    expect(feedScopeTint('public', { verified: true, premium: true })).toBe('var(--moh-text)')
    expect(feedScopeTint('verifiedOnly', { verified: true, premium: true })).toBe('var(--moh-verified)')
    expect(feedScopeTint('premiumOnly', { verified: false, premium: false })).toBe('var(--moh-premium)')
  })
  it('shows membership requirements and emits the scope without changing order', async () => {
    const wrapper = mount(FeedFilters, { props: { ...props, hideSort: true }, global })
    await wrapper.get('button').trigger('click')
    expect(wrapper.findAll('[role="menuitemradio"]')).toHaveLength(4)
    expect(wrapper.text()).toContain('Verification required')
    await wrapper.findAll('[role="menuitemradio"]')[2]!.trigger('click')
    expect(wrapper.emitted('update:filter')).toEqual([['verifiedOnly']])
    expect(wrapper.emitted('update:sort')).toBeUndefined()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    wrapper.unmount()
  })
  it('counts and resets only options available in the current view', async () => {
    const wrapper = mount(FeedFilters, { props: { ...props, sort: 'trending', filter: 'premiumOnly', showVisibilityFilter: false }, global })
    expect(wrapper.get('.filter-count').text()).toBe('1')
    await wrapper.get('button').trigger('click')
    expect(wrapper.findAll('[role="menuitemradio"]')).toHaveLength(2)
    await wrapper.get('.filter-reset').trigger('click')
    expect(wrapper.emitted('update:sort')).toEqual([['new']])
    expect(wrapper.emitted('update:filter')).toBeUndefined()
    wrapper.unmount()
  })
  it('supports keyboard navigation and Escape restores trigger focus', async () => {
    const wrapper = mount(FeedFilters, { props, global, attachTo: document.body })
    const trigger = wrapper.get('button')
    await trigger.trigger('click')
    await nextTick()
    const menu = wrapper.get('[role="menu"]')
    await menu.trigger('keydown', { key: 'End' })
    expect(document.activeElement).toBe(wrapper.findAll('[role="menuitemradio"]').at(-1)!.element)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })
})
