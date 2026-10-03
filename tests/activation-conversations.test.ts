import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import ActivationConversations from '~/components/app/feed/ActivationConversations.vue'

const state = vi.hoisted(() => ({ fetch: vi.fn() }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: state.fetch }))
mockNuxtImport('useAuth', () => () => ({ user: ref({ id: 'viewer' }) }))
const cleanups: Array<() => void> = []
const post = { id: 'conversation', body: 'What are you working on?', author: { id: 'another-man' } }
beforeEach(() => state.fetch.mockReset())
afterEach(() => cleanups.splice(0).forEach(cleanup => cleanup()))
async function render() {
  const view = await mountSuspended(ActivationConversations, { global: { stubs: { AppUserIdentityLine: true } } })
  cleanups.push(() => view.unmount())
  await flushPromises()
  return view
}

it('loads recent conversations using the API sort and lets the viewer reply', async () => {
  state.fetch.mockImplementation(async (path, options) => {
    if (path !== '/posts') return null
    if (options.query.sort !== 'new') throw new Error('Invalid sort')
    return [post]
  })
  const view = await render()
  expect(view.find('[role="alert"]').exists()).toBe(false)
  expect(view.text()).toContain(post.body)
  expect(state.fetch).toHaveBeenCalledWith('/posts', { query: { limit: 20, sort: 'new', visibility: 'all', topLevelOnly: true } })
  await view.findAll('button').find(button => button.text() === 'Reply')!.trigger('click')
  expect(view.emitted('reply')).toEqual([[post]])
})

it('recovers from a failed request when the viewer retries', async () => {
  state.fetch.mockRejectedValue(new Error('Connection failed'))
  const view = await render()
  expect(view.find('[role="alert"]').exists()).toBe(true)
  state.fetch.mockResolvedValue([post])
  await view.findAll('button').find(button => button.text() === 'Try again')!.trigger('click')
  await flushPromises()
  expect(view.find('[role="alert"]').exists()).toBe(false)
  expect(view.text()).toContain(post.body)
})
