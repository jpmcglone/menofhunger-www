import { mount } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { defineComponent, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMarv } from '~/composables/useMarv'
import type { MarvinMeDto, MarvCreditsUpdatedPayloadDto } from '~/types/api'

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), patch: vi.fn(), add: vi.fn(), remove: vi.fn() }))
const user = ref<{ id: string; premium: boolean }>({ id: 'first', premium: true })
let app = {}
const states = new Map<string, ReturnType<typeof ref>>()
mockNuxtImport('useNuxtApp', () => () => app)
mockNuxtImport('useState', () => (key: string, initial: () => unknown) => {
  if (!states.has(key)) states.set(key, ref(initial()))
  return states.get(key)
})
vi.mock('~/composables/useAuth', () => ({ useAuth: () => ({ user }) }))
vi.mock('~/composables/useApiClient', () => ({ useApiClient: () => ({ apiFetchData: mocks.fetch, apiFetch: mocks.patch }) }))
vi.mock('~/composables/usePresence', () => ({ usePresence: () => ({ addMarvCallback: mocks.add, removeMarvCallback: mocks.remove }) }))
const data = (credits: number) => ({ enabled: true, isPremium: true, preferredMode: 'auto', credits: { credits, maxCredits: 100, creditsPerDay: 10, lastRefilledAt: '2026-10-09' }, marv: { userId: 'marv', username: 'marv' } }) as MarvinMeDto
const wrappers: ReturnType<typeof mount>[] = []
function consumer() {
  let state!: ReturnType<typeof useMarv>
  wrappers.push(mount(defineComponent({ setup() { state = useMarv(); return () => null } })))
  return state
}
beforeEach(() => {
  vi.clearAllMocks()
  states.clear()
  app = {}
  user.value = { id: 'first', premium: true }
  mocks.fetch.mockResolvedValue(data(50))
})
afterEach(() => { for (const wrapper of wrappers.splice(0)) wrapper.unmount() })

describe('shared MARV state', () => {
  it('coalesces loads and keeps one subscription until the last active consumer stops', async () => {
    const first = consumer()
    const second = consumer()
    first.startRealtime()
    first.startRealtime()
    second.startRealtime()
    await Promise.all([first.ensureLoaded(), second.ensureLoaded()])
    expect(mocks.fetch).toHaveBeenCalledTimes(1)
    expect(mocks.add).toHaveBeenCalledTimes(1)
    first.stopRealtime()
    first.stopRealtime()
    expect(mocks.remove).not.toHaveBeenCalled()
    const callback = mocks.add.mock.calls[0]![0]
    callback.onCreditsUpdated({ ...data(42).credits })
    expect(second.credits.value?.credits).toBe(42)
    second.stopRealtime()
    expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(callback)
  })

  it('clears identity immediately and rejects an old account load', async () => {
    let resolve!: (value: MarvinMeDto) => void
    mocks.fetch.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const state = consumer()
    const pending = state.ensureLoaded()
    user.value = { id: 'second', premium: true }
    expect(state.me.value).toBeNull()
    await state.ensureLoaded()
    resolve(data(999))
    await pending
    expect(state.credits.value?.credits).toBe(50)
  })

  it('rejects an old account preference response', async () => {
    let resolve!: (value: { data: MarvinMeDto }) => void
    mocks.patch.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const state = consumer()
    await state.ensureLoaded()
    const pending = state.setPreferredMode('smart')
    user.value = { id: 'second', premium: true }
    await state.ensureLoaded()
    resolve({ data: { ...data(999), preferredMode: 'smart' } })
    await pending
    expect(state.preferredMode.value).toBe('auto')
    expect(state.credits.value?.credits).toBe(50)
  })

  it('preserves newer realtime credits when an HTTP refresh arrives later', async () => {
    const state = consumer()
    await state.ensureLoaded()
    let resolve!: (value: MarvinMeDto) => void
    mocks.fetch.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const pending = state.fetchMe({ forceRefresh: true })
    state.applyCreditsUpdate({ ...data(38).credits } as MarvCreditsUpdatedPayloadDto)
    resolve(data(50))
    await pending
    expect(state.credits.value?.credits).toBe(38)
  })
})
