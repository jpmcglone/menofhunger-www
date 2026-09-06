import { defineComponent, h, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMarvCatchUp } from '../composables/useMarvCatchUp'
import type { FeedPost } from '../types/api'
const spies = vi.hoisted(() => ({ fetch: vi.fn() }))
const mode = ref('auto')
const user = ref({ id: 'member' })
mockNuxtImport('useApiClient', () => () => ({ apiFetch: spies.fetch }))
mockNuxtImport('useMarv', () => () => ({ preferredMode: mode }))
mockNuxtImport('useAuth', () => () => ({ user }))
function harness() {
  let state!: ReturnType<typeof useMarvCatchUp>
  const wrapper = mount(defineComponent({ setup() { state = useMarvCatchUp(); state.reset(); state.post.value = null; return () => h('div') } }))
  return { state, wrapper }
}
beforeEach(() => { spies.fetch.mockReset(); user.value = { id: 'member' } })
describe('catch up request lifecycle', () => {
  it('opens with a free cache peek and ignores a late response for the previous post', async () => {
    let first!: (result: unknown) => void
    spies.fetch.mockImplementationOnce(() => new Promise(resolve => { first = resolve })).mockResolvedValueOnce({ data: { postId: 'second', summary: 'Second summary' } })
    const { state, wrapper } = harness()
    state.show({ id: 'first' } as FeedPost)
    state.show({ id: 'second' } as FeedPost)
    await flushPromises()
    first({ data: { postId: 'first', summary: 'Old response' } })
    await flushPromises()
    expect(state.result.value?.summary).toBe('Second summary')
    expect(spies.fetch.mock.calls.every(([, options]) => options.body.cacheOnly === true)).toBe(true)
    wrapper.unmount()
  })
  it('keeps the paid summary visible during regeneration and after a failure', async () => {
    spies.fetch.mockResolvedValueOnce({ data: { postId: 'post', summary: 'Existing summary' } })
    const { state, wrapper } = harness()
    state.show({ id: 'post' } as FeedPost)
    await flushPromises()
    let reject!: (error: Error) => void
    spies.fetch.mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail }))
    const pending = state.run({ refresh: true })
    expect(state.result.value?.summary).toBe('Existing summary')
    expect(state.loading.value).toBe(true)
    reject(new Error('network failure'))
    await pending
    expect(state.result.value?.summary).toBe('Existing summary')
    expect(state.errorMessage.value).toBeTruthy()
    wrapper.unmount()
  })
})
