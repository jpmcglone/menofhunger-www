import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import Preview from '~/components/app/profile/MetadataPreview.vue'

const state = vi.hoisted(() => ({ fetch: vi.fn() }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: state.fetch }))
let view: VueWrapper | undefined
beforeEach(() => { state.fetch.mockReset() })
afterEach(() => { view?.unmount(); view = undefined; vi.useRealTimers() })
async function render(props: { url: string; title: string; stateCode?: string; xProfileUserId?: string }) {
  view = await mountSuspended(Preview, { props, attachTo: document.body,
    slots: { default: `<a href="${props.url}">Profile link</a>` }, global: { stubs: {
      AppAvatarCircle: { props: ['name'], template: '<span class="avatar">{{ name }}</span>' },
      AppStateShape: true, Icon: true, NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
    } } })
  vi.useFakeTimers()
  return view
}
async function focus() {
  await view!.find('a').trigger('focusin')
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
}
it('waits for intent, caps avatars at six, and closes with Escape without reopening', async () => {
  state.fetch.mockResolvedValue({ location: { stateDisplay: 'Virginia' }, memberCount: 100,
    sections: [{ key: 'sameState', users: Array.from({ length: 10 }, (_, i) => ({ id: `${i}`, name: `Member ${i}`, avatarUrl: null })) }] })
  await render({ url: '/location/US/VA', title: 'Virginia', stateCode: 'VA' })
  expect(state.fetch).not.toHaveBeenCalled()
  await view!.find('a').trigger('focusin')
  await vi.advanceTimersByTimeAsync(299)
  expect(state.fetch).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1); await flushPromises()
  const dialog = document.querySelector('[role="dialog"]')!
  expect(dialog.textContent).toContain('100 members')
  expect(dialog.querySelectorAll('.avatar')).toHaveLength(6)
  expect(dialog.textContent).toContain('+94')
  dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await vi.advanceTimersByTimeAsync(500); await flushPromises()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  expect(document.activeElement).toBe(view!.find('a').element)
})
it('keeps a working link when metadata is blocked', async () => {
  state.fetch.mockRejectedValue(new Error('blocked'))
  await render({ url: 'https://rumble.com/c/example', title: 'Rumble' }); await focus()
  const dialog = document.querySelector('[role="dialog"]')!
  expect(dialog.textContent).toContain('Preview unavailable')
  expect(dialog.querySelector('a')?.getAttribute('href')).toBe('https://rumble.com/c/example')
})
it('shows Message on X only for a current matching private response and expires it', async () => {
  const expires = new Date(Date.now() + 2000).toISOString()
  state.fetch.mockImplementation(async (path: string) => path.endsWith('/context')
    ? { targetId: '123', following: true, followsYou: true, messageUrl: 'https://x.com/messages/compose?recipient_id=123', expiresAt: expires }
    : { id: '123', username: 'example', name: 'Example', verified: false, following: null, followers: 100,
      bannerUrl: 'https://pbs.twimg.com/banner.jpg', expiresAt: new Date(Date.now() + 10000).toISOString() })
  await render({ url: 'https://x.com/example', title: '@example', xProfileUserId: 'member' }); await focus()
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Message on X')
  expect(document.querySelector('[role="dialog"] img')?.getAttribute('src')).toContain('banner.jpg')
  await vi.advanceTimersByTimeAsync(2100)
  expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain('Message on X')
  await vi.advanceTimersByTimeAsync(10000)
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Preview unavailable')
})
it('drops late results when the profile identity changes', async () => {
  let resolve!: (value: unknown) => void
  state.fetch.mockImplementation(() => new Promise(done => { resolve = done }))
  await render({ url: 'https://pickax.com/example', title: 'Pickax' }); await focus()
  await view!.setProps({ url: 'https://rumble.com/c/other', title: 'Rumble' })
  resolve({ title: 'Wrong person' }); await flushPromises()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
})
