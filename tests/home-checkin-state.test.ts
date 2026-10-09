import { computed, effectScope, ref, type Ref, type EffectScope } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useHomeCheckin } from '~/composables/pages/home/useHomeCheckin'
import type { GetCheckinsTodayResponse } from '~/types/api'

const fixture = vi.hoisted(() => ({
  authed: null as unknown as Ref<boolean>,
  page: null as unknown as Ref<boolean>,
  access: null as unknown as Ref<boolean>,
  open: null as unknown as Ref<boolean>,
  state: null as unknown as Ref<GetCheckinsTodayResponse | null>,
  loading: null as unknown as Ref<boolean>,
  error: null as unknown as Ref<string | null>,
  refresh: vi.fn(),
}))
mockNuxtImport('useAuth', () => () => ({ isAuthed: fixture.authed, isPageAccount: fixture.page, canAccessCheckins: fixture.access }))
mockNuxtImport('useEasternMidnightRollover', () => () => ({ dayKey: ref('2026-10-09') }))
mockNuxtImport('useDailyCheckin', () => () => ({ state: fixture.state, loading: fixture.loading, error: fixture.error, refresh: fixture.refresh, create: vi.fn() }))
mockNuxtImport('useCheckinWindow', () => () => ({ isOpen: fixture.open }))
let scope: EffectScope
beforeEach(() => {
  fixture.authed = ref(true)
  fixture.page = ref(false)
  fixture.access = ref(true)
  fixture.open = ref(true)
  fixture.state = ref(null)
  fixture.loading = ref(false)
  fixture.error = ref(null)
  fixture.refresh.mockReset()
  scope = effectScope()
})
afterEach(() => scope.stop())
function setup(hydrated = true) {
  const openComposer = vi.fn()
  const controller = scope.run(() => useHomeCheckin({
    hydrated: ref(hydrated), openComposer,
    feed: { posts: ref([]), feedCtaKind: computed(() => null), viewerIsVerified: computed(() => true) },
  }))!
  return { ...controller, openComposer }
}
function recover() {
  fixture.error.value = null
  fixture.state.value = { prompt: 'What did you learn?', dayKey: '2026-10-09', hasCheckedInToday: false, isOpen: true, allowedVisibilities: ['verifiedOnly'], coins: 0, checkinStreakDays: 0, crew: null }
}
describe('Home check-in state', () => {
  it('resolves the personal schedule outside the window even while data is loading', () => {
    fixture.open.value = false
    fixture.loading.value = true
    const home = setup()
    expect(home.heroResolved.value).toBe(true)
    expect(home.canAnswerCheckin.value).toBe(false)
    recover()
    home.openCheckinComposer()
    expect(home.openComposer).not.toHaveBeenCalled()
  })
  it('does not fetch, resolve, retry or answer while acting as a page', () => {
    fixture.page.value = true
    const home = setup()
    expect(home.heroResolved.value).toBe(false)
    expect(fixture.refresh).not.toHaveBeenCalled()
    recover()
    home.retryCheckin()
    home.openCheckinComposer()
    expect(home.canAnswerCheckin.value).toBe(false)
    expect(fixture.refresh).not.toHaveBeenCalled()
    expect(home.openComposer).not.toHaveBeenCalled()
  })
  it('leaves unverified personal accounts to the schedule/verify hero without a forbidden fetch', () => {
    fixture.access.value = false
    fixture.open.value = false
    const home = setup()
    home.retryCheckin()
    expect(fixture.refresh).not.toHaveBeenCalled()
    expect(home.canAnswerCheckin.value).toBe(false)
  })
  it('resolves a settled error with no dead Answer action, then recovers through retry', () => {
    const home = setup()
    expect(home.heroResolved.value).toBe(false)
    fixture.error.value = 'Failed to load check-in.'
    expect(home.heroResolved.value).toBe(true)
    expect(home.canAnswerCheckin.value).toBe(false)
    fixture.refresh.mockClear()
    home.retryCheckin()
    expect(fixture.refresh).toHaveBeenCalledOnce()
    fixture.loading.value = true
    home.retryCheckin()
    expect(fixture.refresh).toHaveBeenCalledOnce()
    expect(home.heroResolved.value).toBe(false)
    fixture.loading.value = false
    recover()
    expect(home.heroResolved.value).toBe(true)
    expect(home.canAnswerCheckin.value).toBe(true)
    home.openCheckinComposer()
    expect(home.openComposer).toHaveBeenCalledWith(expect.objectContaining({ checkinPrompt: 'What did you learn?', disableMedia: true }))
  })
  it('keeps the first client render unresolved before hydration', () => {
    fixture.open.value = false
    expect(setup(false).heroResolved.value).toBe(false)
  })
})
