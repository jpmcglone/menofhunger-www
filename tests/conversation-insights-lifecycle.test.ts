import { defineComponent, h, KeepAlive, nextTick, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import ConversationInsights from '~/components/app/ConversationInsights.vue'

const recapSpies = vi.hoisted(() => ({
  fetch: vi.fn(),
  presence: {
    addPostsCallback: vi.fn(), removePostsCallback: vi.fn(),
    addUsersCallback: vi.fn(), removeUsersCallback: vi.fn(),
    subscribePosts: vi.fn(), unsubscribePosts: vi.fn(),
  },
}))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: recapSpies.fetch }))
mockNuxtImport('usePresence', () => () => recapSpies.presence)
mockNuxtImport('useAuth', () => () => ({ user: { value: { id: 'viewer' } } }))
mockNuxtImport('useRoute', () => () => ({ query: {} }))

describe('conversation recap lifecycle', () => {
  it('loads once on initial activation, stops while cached, and resyncs on return', async () => {
    vi.clearAllMocks()
    recapSpies.fetch.mockResolvedValue({ posts: [], postCount: 0, participantCount: 0 })
    const visible = ref(true)
    const host = defineComponent({
      setup: () => () => h(KeepAlive, null, {
        default: () => visible.value ? h(ConversationInsights, { postId: 'post' }) : null,
      }),
    })
    const wrapper = mount(host, { global: { stubs: { Icon: true } } })
    try {
      await flushPromises()
      expect(recapSpies.fetch).toHaveBeenCalledTimes(1)
      expect(recapSpies.presence.addPostsCallback).toHaveBeenCalledTimes(1)
      const callback = recapSpies.presence.addPostsCallback.mock.calls[0]![0]
      visible.value = false
      await nextTick()
      expect(recapSpies.presence.removePostsCallback).toHaveBeenCalledWith(callback)
      vi.useFakeTimers()
      callback.onCommentAdded({ parentPostId: 'post' })
      await vi.advanceTimersByTimeAsync(2000)
      expect(recapSpies.fetch).toHaveBeenCalledTimes(1)
      vi.useRealTimers()
      visible.value = true
      await nextTick()
      await flushPromises()
      expect(recapSpies.fetch).toHaveBeenCalledTimes(2)
      expect(recapSpies.presence.addPostsCallback).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
      wrapper.unmount()
    }
  })
})

function deferredInsights() {
  let resolve!: (value: { posts: never[]; postCount: number; participantCount: number }) => void
  const promise = new Promise<{ posts: never[]; postCount: number; participantCount: number }>(done => { resolve = done })
  return { promise, resolve: () => resolve({ posts: [], postCount: 0, participantCount: 0 }) }
}

describe('conversation recap refresh queue', () => {
  it('coalesces events during a request into exactly one subsequent refresh', async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    const first = deferredInsights()
    recapSpies.fetch.mockReset().mockReturnValueOnce(first.promise).mockResolvedValue({ posts: [], postCount: 0, participantCount: 0 })
    const wrapper = mount(ConversationInsights, { props: { postId: 'post' }, global: { stubs: { Icon: true } } })
    try {
      const callback = recapSpies.presence.addPostsCallback.mock.calls[0]![0]
      for (let index = 0; index < 5; index++) callback.onCommentAdded({ parentPostId: 'post' })
      await vi.advanceTimersByTimeAsync(5000)
      expect(recapSpies.fetch).toHaveBeenCalledTimes(1)
      first.resolve()
      await flushPromises()
      await vi.advanceTimersByTimeAsync(1500)
      expect(recapSpies.fetch).toHaveBeenCalledTimes(2)
      await vi.advanceTimersByTimeAsync(5000)
      expect(recapSpies.fetch).toHaveBeenCalledTimes(2)
    } finally { wrapper.unmount(); vi.useRealTimers() }
  })

  it('does not refresh a post recap for unrelated posts or viewer feed additions', async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    recapSpies.fetch.mockReset().mockResolvedValue({ posts: [], postCount: 0, participantCount: 0 })
    const wrapper = mount(ConversationInsights, { props: { postId: 'post' }, global: { stubs: { Icon: true } } })
    try {
      await flushPromises()
      const callback = recapSpies.presence.addPostsCallback.mock.calls[0]![0]
      callback.onLiveUpdated({ postId: 'unrelated', patch: { commentCount: 10 } })
      callback.onCommentDeleted({ parentPostId: 'unrelated' })
      callback.onFeedNewPost({ post: { author: { id: 'viewer' } } })
      await vi.advanceTimersByTimeAsync(3000)
      expect(recapSpies.fetch).toHaveBeenCalledTimes(1)
      callback.onLiveUpdated({ postId: 'post', patch: { commentCount: 2 } })
      await vi.advanceTimersByTimeAsync(1500)
      expect(recapSpies.fetch).toHaveBeenCalledTimes(2)
    } finally { wrapper.unmount(); vi.useRealTimers() }
  })

  it('discards a queued refresh and late response when the component unmounts', async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    const first = deferredInsights()
    recapSpies.fetch.mockReset().mockReturnValue(first.promise)
    const wrapper = mount(ConversationInsights, { props: { postId: 'post' }, global: { stubs: { Icon: true } } })
    try {
      const callback = recapSpies.presence.addPostsCallback.mock.calls[0]![0]
      callback.onCommentDeleted({ parentPostId: 'post' })
      wrapper.unmount()
      first.resolve()
      await flushPromises()
      await vi.advanceTimersByTimeAsync(5000)
      expect(recapSpies.fetch).toHaveBeenCalledTimes(1)
    } finally { vi.useRealTimers() }
  })
})
