import { defineComponent, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, expect, it, vi } from 'vitest'
import { useChannelOutbox } from '~/composables/channels/useChannelOutbox'
import { mergeChannelMessages } from '~/utils/channels/reducer'
import type { ChannelMessage } from '~/types/api'

const state = vi.hoisted(() => ({ fetch: vi.fn() }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: state.fetch }))
mockNuxtImport('useAuth', () => () => ({ user: ref({ id: 'me' }) }))
mockNuxtImport('usePostHog', () => () => ({ capture: vi.fn() }))
mockNuxtImport('useSoundPolicy', () => () => ({ play: vi.fn() }))
beforeEach(() => { state.fetch.mockReset() })

it('sends replyToId with the channel message and keeps the returned quote on merge', async () => {
  const replyTo = { id: 'quoted', senderUsername: 'sam', bodyPreview: 'Twenty minutes done.', mediaThumbnailUrl: null }
  state.fetch.mockResolvedValue({ id: 'sent', sequence: 2, revision: 1, sender: { id: 'me' }, replyTo, deletedForAll: false })
  let outbox!: ReturnType<typeof useChannelOutbox>
  const view = mount(defineComponent({ setup() { outbox = useChannelOutbox(); return () => null } }))
  outbox.enqueue({ id: 'r1', identity: 'me', groupId: 'g', channelId: 'c', draftKey: 'k', draftRevision: 'v', status: 'sending', input: { body: 'Same.', clientRequestId: 'r1', replyToId: 'quoted' } })
  await flushPromises()
  expect(state.fetch).toHaveBeenCalledWith(expect.stringContaining('/messages'), expect.objectContaining({ method: 'POST', body: expect.objectContaining({ replyToId: 'quoted' }) }))
  const sent = outbox.entries.value.find(entry => entry.id === 'r1')!.message as ChannelMessage
  expect(mergeChannelMessages([], [sent])[0]?.replyTo).toEqual(replyTo)
  view.unmount()
})
