import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOpenChat } from '~/composables/chat/useOpenChat'

const ctx = vi.hoisted(() => ({
  route: { path: '/home' }, desktop: { value: true }, pageAccount: { value: false },
  user: { value: { id: 'viewer', siteAdmin: false, verifiedStatus: 'manual' } },
  api: vi.fn(), navigate: vi.fn(), open: vi.fn(), draft: vi.fn(), error: vi.fn(),
}))
vi.mock('~/composables/chat/useDesktopChatDock', () => ({ useDesktopChatDock: () => ({ desktop: ctx.desktop, open: ctx.open, openDraft: ctx.draft }) }))
mockNuxtImport('useRoute', () => () => ctx.route)
mockNuxtImport('useAuth', () => () => ({ user: ctx.user, isPageAccount: ctx.pageAccount }))
mockNuxtImport('useApiClient', () => () => ({ apiFetchData: ctx.api }))
mockNuxtImport('useAppToast', () => () => ({ pushError: ctx.error }))
mockNuxtImport('navigateTo', () => ctx.navigate)
const preview = { id: 'person', username: 'person', name: 'Person', verifiedStatus: 'manual', relationship: {}, premium: false, premiumPlus: false, isOrganization: false }
beforeEach(() => {
  vi.clearAllMocks()
  ctx.route.path = '/home'; ctx.desktop.value = true; ctx.pageAccount.value = false
  ctx.user.value = { id: 'viewer', siteAdmin: false, verifiedStatus: 'manual' }
  ctx.api.mockImplementation(async (path: string) => path.endsWith('/preview') ? preview : { conversationId: 'existing' })
})
describe('Message destination', () => {
  it('opens the existing dock conversation without leaving the page', async () => {
    await useOpenChat().openChat('person')
    expect(ctx.open).toHaveBeenCalledWith('existing')
    expect(ctx.navigate).not.toHaveBeenCalled()
  })
  it('reuses a known conversation without another lookup', async () => {
    await useOpenChat().openChat('person', 'existing')
    expect(ctx.open).toHaveBeenCalledWith('existing')
    expect(ctx.api).not.toHaveBeenCalled()
  })
  it('opens a recipient draft when no conversation exists', async () => {
    ctx.api.mockImplementation(async (path: string) => path.endsWith('/preview') ? preview : { conversationId: null })
    await useOpenChat().openChat('person')
    expect(ctx.draft).toHaveBeenCalledWith([expect.objectContaining({ id: 'person', username: 'person' })])
  })
  it.each(['full-page', 'mobile', 'page-account'])('preserves normal navigation for %s', async mode => {
    if (mode === 'full-page') ctx.route.path = '/chat'
    if (mode === 'mobile') ctx.desktop.value = false
    if (mode === 'page-account') ctx.pageAccount.value = true
    await useOpenChat().openChat('person')
    expect(ctx.navigate).toHaveBeenCalledWith({ path: '/chat', query: { to: 'person' } })
    expect(ctx.open).not.toHaveBeenCalled()
  })
  it('preserves modified links and intercepts normal desktop clicks', async () => {
    const action = useOpenChat()
    const modified = new MouseEvent('click', { ctrlKey: true, cancelable: true })
    action.onMessageLinkClick(modified, 'person')
    expect(modified.defaultPrevented).toBe(false)
    expect(ctx.api).not.toHaveBeenCalled()
    const normal = new MouseEvent('click', { cancelable: true })
    action.onMessageLinkClick(normal, 'person')
    expect(normal.defaultPrevented).toBe(true)
    await flushPromises()
    expect(ctx.open).toHaveBeenCalledWith('existing')
  })
  it('discards async results after the viewer changes', async () => {
    const result = ref<((value: unknown) => void) | null>(null)
    ctx.api.mockImplementation(() => new Promise(resolve => { result.value = resolve }))
    const pending = useOpenChat().openChat('person')
    ctx.user.value = { ...ctx.user.value, id: 'different-viewer' }
    result.value!(preview)
    await pending
    expect(ctx.open).not.toHaveBeenCalled()
    expect(ctx.draft).not.toHaveBeenCalled()
  })
  it('keeps the existing verification gate for unverified viewers', async () => {
    ctx.user.value.verifiedStatus = 'none'
    await useOpenChat().openChat('person', 'existing')
    expect(ctx.navigate).toHaveBeenCalledWith({ path: '/chat', query: { c: 'existing' } })
    expect(ctx.open).not.toHaveBeenCalled()
  })
  it('does not create a new draft with an unverified target for a non-admin', async () => {
    ctx.api.mockImplementation(async (path: string) => path.endsWith('/preview') ? { ...preview, verifiedStatus: 'none' } : { conversationId: null })
    await useOpenChat().openChat('person')
    expect(ctx.draft).not.toHaveBeenCalled()
  })
  it('reports lookup errors without opening a duplicate draft', async () => {
    ctx.api.mockRejectedValue(new Error('unavailable'))
    await useOpenChat().openChat('person')
    expect(ctx.error).toHaveBeenCalled()
    expect(ctx.draft).not.toHaveBeenCalled()
  })
})
