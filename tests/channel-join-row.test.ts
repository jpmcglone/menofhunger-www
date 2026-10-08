import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { expect, it } from 'vitest'
import JoinRow from '~/components/app/channels/JoinRow.vue'
import { isJoinRow, markWelcomed, welcomeFirstName } from '~/utils/channels/join-row'
import { mergeChannelMessages } from '~/utils/channels/reducer'
import type { ChannelMessage } from '~/types/api'

mockNuxtImport('useAuth', () => () => ({ user: ref({ id: 'me' }) }))

const join = (patch: Partial<ChannelMessage> = {}) => ({
  id: 'join', sequence: 4, revision: 1, kind: 'groupJoin', body: '', createdAt: '2026-10-08T18:38:00.000Z', deletedForAll: false, replyCount: 0, threadRootId: null,
  sender: { id: 'chris', username: 'chris', name: 'Chris Hale' }, joinWelcome: { canWelcome: true }, ...patch,
}) as unknown as ChannelMessage
const stubs = { NuxtLink: { template: '<a><slot /></a>' } }

it('shows "<name> joined the group" with a Welcome button that emits once pressed', async () => {
  const view = mount(JoinRow, { props: { message: join() }, global: { stubs } })
  expect(view.text()).toContain('Chris Hale')
  expect(view.text()).toContain('joined the group')
  const button = view.get('[data-testid="channel-welcome"]')
  expect(button.text()).toContain('Welcome Chris')
  await button.trigger('click')
  expect(view.emitted('welcome')).toHaveLength(1)
})

it('hides the button for the joiner and after the viewer has welcomed', () => {
  expect(mount(JoinRow, { props: { message: join({ joinWelcome: { canWelcome: false } }) }, global: { stubs } }).find('[data-testid="channel-welcome"]').exists()).toBe(false)
  expect(mount(JoinRow, { props: { message: join({ joinWelcome: null }) }, global: { stubs } }).find('[data-testid="channel-welcome"]').exists()).toBe(false)
})

it('falls back to the username and recognises join rows', () => {
  expect(welcomeFirstName({ name: null, username: 'dev' })).toBe('dev')
  expect(welcomeFirstName({ name: '  Dev Patel ', username: 'dev' })).toBe('Dev')
  expect(isJoinRow(join())).toBe(true)
  expect(isJoinRow({ kind: 'text' })).toBe(false)
})

it('a realtime snapshot beats the optimistic hide, and the optimistic hide never beats a newer snapshot', () => {
  const row = join()
  const hidden = mergeChannelMessages([row], [markWelcomed(row)])[0]!
  expect(hidden.joinWelcome).toEqual({ canWelcome: false })
  const newer = join({ revision: 2, joinWelcome: { canWelcome: false } })
  expect(mergeChannelMessages([newer], [markWelcomed(row)])[0]!.revision).toBe(2)
})
