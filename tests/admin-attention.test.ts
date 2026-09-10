import { useNuxtApp } from '#app'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import type { AdminAttentionDto } from '~/types/api'
import { usePrivateApiData } from '~/composables/usePrivateApiData'
import Inbox from '~/pages/admin/attention/index.vue'
import Conversations from '~/pages/admin/attention/conversations.vue'
import legacyRedirect from '~/middleware/admin-attention-legacy'

vi.mock('~/composables/usePrivateApiData', () => ({ usePrivateApiData: vi.fn() }))
const navigate = vi.hoisted(() => vi.fn())
mockNuxtImport('navigateTo', () => navigate)

const snapshot = (): AdminAttentionDto => ({
  asOf: '2026-09-09T12:00:00Z',
  items: [{ id: 'unanswered', title: 'Conversations needing a reply', detail: 'No human replies', count: 24, path: '/admin/attention#conversations', priority: 'participate' }],
  unansweredPosts: [{ id: 'post-1', body: 'How do you start your morning?', username: 'james', createdAt: '2026-09-08T12:00:00Z' }],
  pulse: {
    windowDays: 7,
    since: '2026-09-02T12:00:00Z',
    before: '2026-09-09T12:00:00Z',
    memberRoots: 8,
    repliedWithin24h: 3,
    replyRate24hPct: 37.5,
    authors: 3,
    authorsReturned: 2,
    authorsReturnedPct: 66.7,
    lodgePromptReplies: 0,
    lodgePromptId: 'lodge-1',
    verificationPending: 4,
    oldestVerificationRequestedAt: '2026-08-05T00:00:00Z',
    definitions: ['Member posts'],
  },
})
const data = ref<AdminAttentionDto | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const refresh = vi.fn()
const options = { global: { stubs: { Icon: true, AppIconGlyph: true, Skeleton: true, Button: { props: ['label'], template: '<button>{{ label }}</button>' } } } }

beforeEach(() => {
  vi.clearAllMocks()
  data.value = snapshot()
  loading.value = false
  error.value = null
  vi.mocked(usePrivateApiData).mockReturnValue({ data, loading, error, refresh } as ReturnType<typeof usePrivateApiData>)
})

describe('admin conversation queue', () => {
  it('resolves the inbox and dedicated queue as separate admin pages', () => {
    const router = useNuxtApp().$router
    for (const [path, name] of [['/admin/attention', 'admin-attention'], ['/admin/attention/conversations', 'admin-attention-conversations']]) {
      const route = router.resolve(path!)
      expect(route.name).toBe(name)
      expect(route.matched.map(record => record.name)).toEqual(['admin', name])
      expect(route.meta.middleware).toContain('admin')
    }
  })

  it('links directly to the queue even with a legacy API destination', async () => {
    const wrapper = await mountSuspended(Inbox, options)
    try {
      expect(wrapper.get('a[href="/admin/attention/conversations"]').text()).toContain('Conversations needing a reply')
      expect(wrapper.find('#conversations').exists()).toBe(false)
      expect(wrapper.text()).toContain('Member posts answered in 24 hours')
      expect(wrapper.text()).toContain('3 of 8')
      expect(wrapper.text()).toContain('Lodge prompt replies')
    } finally { wrapper.unmount() }
  })

  it('keeps the weekly pulse when the work list is clear', async () => {
    data.value = { ...snapshot(), items: [] }
    const wrapper = await mountSuspended(Inbox, options)
    try {
      expect(wrapper.text()).toContain('Those authors active again')
      expect(wrapper.text()).toContain("You're up to date.")
      expect(wrapper.find('a[href="/admin/attention/conversations"]').exists()).toBe(false)
    } finally { wrapper.unmount() }
  })

  it('shows the bounded queue count and real post links', async () => {
    const wrapper = await mountSuspended(Conversations, options)
    try {
      expect(wrapper.text()).toContain('Showing the oldest 1 of 24 posts')
      expect(wrapper.get('a[href="/p/post-1"]').text()).toContain('How do you start your morning?')
      expect(wrapper.get('a[href="/admin/attention"]').text()).toContain('Attention inbox')
      expect(wrapper.text()).toContain('Member posts are listed first.')
      expect(usePrivateApiData).toHaveBeenCalledWith('/admin/operations/attention')
    } finally { wrapper.unmount() }
  })

  it('gives an empty queue a clear destination and empty state', async () => {
    data.value = { ...snapshot(), items: [], unansweredPosts: [] }
    const wrapper = await mountSuspended(Conversations, options)
    try {
      expect(wrapper.text()).toContain('No conversations need a first reply.')
      expect(wrapper.findAll('a[href^="/p/"]')).toHaveLength(0)
    } finally { wrapper.unmount() }
  })

  it('shows loading and lets a failed request be retried', async () => {
    data.value = null
    loading.value = true
    const wrapper = await mountSuspended(Conversations, options)
    try {
      expect(wrapper.get('[role="status"]').attributes('aria-label')).toBe('Loading conversations')
      loading.value = false
      error.value = 'Network error'
      await wrapper.vm.$nextTick()
      expect(wrapper.get('[role="alert"]').text()).toContain('Could not load conversations.')
      await wrapper.get('[role="alert"] button').trigger('click')
      expect(refresh).toHaveBeenCalledOnce()
    } finally { wrapper.unmount() }
  })

  it('redirects old hash links with replace and preserves the query', () => {
    const to = { hash: '#conversations', query: { source: 'inbox' } } as unknown as RouteLocationNormalized
    legacyRedirect(to, to)
    expect(navigate).toHaveBeenCalledWith({ path: '/admin/attention/conversations', query: { source: 'inbox' } }, { replace: true })
    navigate.mockClear()
    legacyRedirect({ ...to, hash: '' }, to)
    expect(navigate).not.toHaveBeenCalled()
  })
})
