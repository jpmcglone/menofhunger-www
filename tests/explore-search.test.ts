import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import Results from '~/components/app/ExploreSearchResults.vue'
import GroupCard from '~/components/app/groups/AppGroupPreviewCard.vue'
import type { CommunityGroupPreview, SearchUserResult } from '~/types/api'

mockNuxtImport('useAuth', () => () => ({ isAuthed: ref(true), isVerifiedMember: ref(true) }))
mockNuxtImport('useGroupPreviewPopover', () => () => ({ close: vi.fn() }))
const button = { props: ['label', 'disabled'], template: '<button :disabled="disabled">{{ label }}</button>' }
const global = { stubs: { Button: button, Icon: true, Skeleton: true, AppUserRow: true, AppFeedPostRow: true, AppArticleListCard: true, AppGroupPreviewCard: true, AppGroupsGroupAvatar: true } }
const props = {
  users: [{ id: 'person-1', username: 'jordan' } as SearchUserResult], groups: [], posts: [], articles: [],
  category: 'all', query: 'jordan', loading: false, loadingMore: false, error: null,
  searched: true, hasMore: false, gatedCount: 0, joiningId: null, topics: [],
}

describe('Explore search categories', () => {
  it('switches categories without discarding the loaded people', async () => {
    const wrapper = await mountSuspended(Results, { props, global })
    try {
      expect(wrapper.findAllComponents({ name: 'AppUserRow' })).toHaveLength(1)
      await wrapper.setProps({ category: 'groups' })
      expect(wrapper.text()).toContain('No groups found')
      const all = wrapper.findAll('button').find(b => b.text() === 'See all results')!
      await all.trigger('click')
      expect(wrapper.emitted('category')?.[0]).toEqual(['all'])
      await wrapper.setProps({ category: 'people' })
      expect(wrapper.findAllComponents({ name: 'AppUserRow' })).toHaveLength(1)
    } finally { wrapper.unmount() }
  })

  it('shows a loading state before an empty response, with an actionable clear', async () => {
    const wrapper = await mountSuspended(Results, { props: { ...props, users: [], loading: true }, global })
    try {
      expect(wrapper.get('[role="status"]').attributes('aria-label')).toBe('Searching')
      expect(wrapper.text()).not.toContain('No results found')
      await wrapper.setProps({ loading: false })
      await wrapper.findAll('button').find(b => b.text() === 'Clear search')!.trigger('click')
      expect(wrapper.emitted('clear')).toHaveLength(1)
    } finally { wrapper.unmount() }
  })

  it('keeps existing results visible after a pagination error and offers retry', async () => {
    const wrapper = await mountSuspended(Results, { props: { ...props, error: 'Could not load more.' }, global })
    try {
      expect(wrapper.findAllComponents({ name: 'AppUserRow' })).toHaveLength(1)
      await wrapper.findAll('button').find(b => b.text() === 'Try again')!.trigger('click')
      expect(wrapper.emitted('retry')).toHaveLength(1)
    } finally { wrapper.unmount() }
  })
})

describe('compact group discovery', () => {
  const preview = { id: 'g1', slug: 'practice', name: 'The Daily Practice', memberCount: 4, joinPolicy: 'approval', viewerMembership: null, viewerPendingApproval: false } as CommunityGroupPreview
  it('requests approval with a separate action, then displays pending and joined states', async () => {
    const wrapper = await mountSuspended(GroupCard, { props: { preview, compact: true, showJoin: true }, global: { stubs: { Button: button, AppGroupsGroupAvatar: true } } })
    try {
      await wrapper.findAll('button').find(b => b.text() === 'Request to join')!.trigger('click')
      expect(wrapper.emitted('join')).toHaveLength(1)
      expect(wrapper.get('a').attributes('href')).toBe('/g/practice')
      await wrapper.setProps({ preview: { ...preview, viewerPendingApproval: true } })
      expect(wrapper.get('button').text()).toBe('Request pending')
      expect(wrapper.get('button').attributes('disabled')).toBeDefined()
      await wrapper.setProps({ preview: { ...preview, viewerMembership: { role: 'member', status: 'active' } } })
      expect(wrapper.findAll('a').some(a => a.text() === 'View group')).toBe(true)
    } finally { wrapper.unmount() }
  })
})
