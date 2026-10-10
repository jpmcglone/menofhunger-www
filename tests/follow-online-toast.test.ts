import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive, ref } from 'vue'
import FollowOnlineToast from '~/components/app/people/FollowOnlineToast.vue'
import { mediaFocus } from '~/utils/mediaFocus'
import { resetSoundPolicyForTests } from '~/utils/sound-policy'

const state = vi.hoisted(() => ({ callbacks: new Map<string, Record<string, (data: unknown) => void>>(), play: vi.fn(), markRead: vi.fn() }))
const user = ref<{ id: string } | null>({ id: 'viewer' })
const route = reactive({ path: '/home' })
const paused = ref(false)
const room = ref(true)
const incoming = ref(null)
mockNuxtImport('useState', () => () => paused)
mockNuxtImport('useAuth', () => () => ({ user }))
mockNuxtImport('useRoute', () => () => route)
mockNuxtImport('usePresenceChimes', () => () => ({ play: state.play }))
mockNuxtImport('useUsersStore', () => () => ({ overlay: (value: unknown) => value }))
vi.mock('~/composables/useActivityToastRoom', () => ({ useActivityToastRoom: () => room }))
vi.mock('~/composables/notifications/useActivityNotificationRead', () => ({ useActivityNotificationRead: () => ({ markRead: state.markRead, notifications: ref([]) }) }))
vi.mock('~/composables/calls/useCallSession', () => ({ useCallSession: () => ({ incoming }) }))
vi.mock('~/composables/useSpaceLobby', () => ({ useSpaceLobby: () => ({ selectedSpaceId: ref(null), currentSpace: ref(null) }) }))
vi.mock('~/composables/presence/usePresenceCallback', () => ({ usePresenceCallback: (kind: string, callback: Record<string, (data: unknown) => void>) => { state.callbacks.set(kind, callback) } }))
const payload = { users: [{ id: 'followed', name: 'Alex', username: 'alex' }], total: 1 }
let wrapper: Awaited<ReturnType<typeof mountSuspended>> | undefined
async function show(online = true) { state.callbacks.get('FollowedOnline')?.[online ? 'onFollowedOnline' : 'onFollowedOffline']?.(payload); await nextTick() }
function notification(id: string, context = {}) { return { notification: { id, kind: 'comment', createdAt: new Date().toISOString(), actor: { id: 'other', name: 'Alex', username: 'alex' }, readAt: null, ignoredAt: null, title: 'replied to you', body: 'Hello', ...context } } }
async function notify(data: unknown) { state.callbacks.get('Notifications')?.onNew?.(data); vi.advanceTimersByTime(100); await nextTick() }
const cards = () => [...document.body.querySelectorAll('.moh-activity-card')]
beforeEach(async () => {
  user.value = { id: 'viewer' }; route.path = '/home'; paused.value = false; room.value = true
  state.callbacks.clear(); state.play.mockClear(); state.markRead.mockClear(); mediaFocus.reset(); resetSoundPolicyForTests()
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  wrapper = await mountSuspended(FollowOnlineToast, {
    attachTo: document.body,
    global: { stubs: { AppNotificationEventIcon: true, Icon: true, NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } },
  })
  vi.useFakeTimers()
})
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; mediaFocus.reset(); vi.useRealTimers(); vi.restoreAllMocks() })
describe('desktop activity cards', () => {
  it('shows online/offline moments, deduplicates and pauses lifetime for pointer and keyboard', async () => {
    await show(); await show()
    expect(cards()).toHaveLength(1)
    expect(cards()[0]?.textContent).toContain('Alex is online')
    vi.advanceTimersByTime(2000)
    const card = cards()[0]!
    card.dispatchEvent(new MouseEvent('mouseenter'))
    vi.advanceTimersByTime(10000)
    const link = card.querySelector('a')!
    link.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    card.dispatchEvent(new MouseEvent('mouseleave'))
    vi.advanceTimersByTime(10000)
    expect(cards()).toHaveLength(1)
    link.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }))
    vi.advanceTimersByTime(4000); await nextTick()
    expect(cards()).toHaveLength(0)
    await show(false)
    expect(cards()[0]?.textContent).toContain('Alex is offline')
    expect(state.play.mock.calls.map(call => call[0])).toEqual(['follow','offline'])
  })
  it('routes notification targets, handles actorless titles and deletes visible rows without another sound', async () => {
    await notify(notification('board', { boardThreadId: 't' }))
    expect(cards()[0]?.querySelector('a')?.getAttribute('href')).toBe('/b/t')
    await notify(notification('system', { kind: 'generic', actor: null, title: 'Account update' }))
    expect(cards()[1]?.textContent).toContain('Account update')
    expect(cards()[1]?.textContent).not.toContain('Someone')
    expect(cards()[1]?.querySelector('a')?.getAttribute('href')).toBe('/notifications')
    state.callbacks.get('Notifications')?.onDeleted?.({ notificationIds: ['board'] }); await nextTick()
    expect(cards()).toHaveLength(1)
    expect(state.play).not.toHaveBeenCalled()
  })
  it('batches a burst, caps three and suppresses message echoes, silent, own, stale and duplicate events', async () => {
    for (let i=0;i<6;i++) state.callbacks.get('Notifications')?.onNew?.(notification(String(i)))
    vi.advanceTimersByTime(100); await nextTick()
    expect(cards()).toHaveLength(3)
    expect(cards()[0]?.textContent).toContain('4 new notifications')
    await notify(notification('5'))
    await notify({ ...notification('silent'), silent: true })
    await notify(notification('own', { actor: { id: 'viewer' } }))
    await notify(notification('dm', { kind: 'message' }))
    await notify(notification('old', { createdAt: new Date(Date.now()-16000).toISOString() }))
    expect(cards()).toHaveLength(3)
    state.callbacks.get('Notifications')?.onDeleted?.({ notificationIds: ['0'] }); await nextTick()
    expect(cards()).toHaveLength(2)
  })
  it('drops unavailable events and clears on identity, hidden, calls, quiet and crowded dock without replay', async () => {
    await show(); user.value = { id: 'other-viewer' }; await nextTick(); expect(cards()).toHaveLength(0)
    await show(); mediaFocus.setCallActive(true); await nextTick(); expect(cards()).toHaveLength(0)
    mediaFocus.setCallActive(false); room.value = false; await nextTick(); await notify(notification('crowded')); expect(cards()).toHaveLength(0)
    room.value = true; paused.value = true; await nextTick(); await show(); expect(cards()).toHaveLength(0)
    paused.value = false; vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden'); await show(); expect(cards()).toHaveLength(0)
  })
  it('keeps map presence silent while permitting real notification arrivals', async () => {
    route.path = '/map'; await show(); expect(cards()).toHaveLength(0)
    await notify(notification('n')); expect(cards()).toHaveLength(1)
  })
  it('acknowledges individual links including new-tab clicks, but keeps a burst summary unread', async () => {
    await notify(notification('one'))
    cards()[0]?.querySelector('a')?.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }))
    await nextTick()
    expect(state.markRead).toHaveBeenCalledWith('one')
    expect(cards()).toHaveLength(0)
    for (let i=0;i<5;i++) state.callbacks.get('Notifications')?.onNew?.(notification(`burst-${i}`))
    vi.advanceTimersByTime(100); await nextTick()
    cards()[0]?.querySelector('a')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(state.markRead).toHaveBeenCalledTimes(1)
    cards()[0]?.querySelector('a')?.dispatchEvent(new MouseEvent('auxclick', { bubbles: true, button: 1 }))
    expect(state.markRead).toHaveBeenLastCalledWith('burst-3')
  })
  it('removes pending and visible notifications on existing subject-read and quiet read updates', async () => {
    state.callbacks.get('Notifications')?.onNew?.(notification('pending', { subjectPostId: 'post' }))
    state.callbacks.get('Notifications')?.onUpdated?.({ clearedPostIds: ['post'] })
    vi.advanceTimersByTime(100); await nextTick()
    expect(cards()).toHaveLength(0)
    await notify(notification('board', { boardThreadId: 'thread' }))
    state.callbacks.get('Notifications')?.onUpdated?.({ clearedBoardThreadIds: ['thread'] }); await nextTick()
    expect(cards()).toHaveLength(0)
    await notify(notification('quiet'))
    await notify({ ...notification('quiet', { readAt: new Date().toISOString() }), silent: true })
    expect(cards()).toHaveLength(0)
  })
})
