import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import List from '~/components/app/chat/ChatConversationList.vue'
import MarvRow from '~/components/app/chat/ChatMarvPinnedRow.vue'
import type { MessageConversation, MessageUser } from '~/types/api'

mockNuxtImport('useUsersStore', () => () => ({ overlay: (user: MessageUser) => user }))
mockNuxtImport('useMarv', () => () => ({ isAvailable: ref(true), enabled: ref(true), isPremium: ref(true), marvDisplayName: ref('MARV'), marvUsername: ref('marv'), marvAvatarUrl: ref(null), marvAvatarVideo: ref(null), credits: ref(null), marvUserId: ref('marv-user') }))
afterEach(() => vi.restoreAllMocks())
const conversation = { id: 'a', type: 'direct', participants: [], unreadCount: 0, lastMessageAt: null, lastMessage: null } as unknown as MessageConversation
const props = {
  isTinyViewport: true, canStartNew: true, activeTab: 'primary' as const, activeList: [conversation], listLoading: false, showRequestsBadge: false,
  requestsBadgeText: '', badgeToneClass: '', selectedConversationId: null, nextCursor: null, loadingMore: false, typingUsersByConversationId: {},
  formatListTime: () => '', getConversationTitle: () => 'A', getConversationPreview: () => '', getDirectUser: () => null,
  conversationUnreadHighlightClass: () => '', conversationDotClass: () => '',
}

describe('picker links with the real Nuxt router', () => {
  it('captures normal/search row selection before RouterLink can navigate', async () => {
    const wrapper = await mountSuspended(List, { props })
    const router = useNuxtApp().$router
    const push = vi.spyOn(router, 'push')
    const before = router.currentRoute.value.fullPath
    await wrapper.get('a[href="/chat?c=a"]').trigger('click', { button: 0 })
    await flushPromises()
    expect(wrapper.emitted('select')).toEqual([['a']])
    expect(push).not.toHaveBeenCalled()
    expect(router.currentRoute.value.fullPath).toBe(before)
    await wrapper.setProps({ activeList: [{ ...conversation, matchedMessage: { id: 'target', body: 'Result', createdAt: '2026-10-09T00:00:00Z' } }] })
    await wrapper.get('a[href="/chat?c=a"]').trigger('click', { button: 0 })
    await flushPromises()
    expect(wrapper.emitted('select-to-message')).toEqual([['a', 'target']])
    expect(push).not.toHaveBeenCalled()
    wrapper.unmount()
  })
  it('captures the pinned MARV draft while retaining its actual full-chat href', async () => {
    const wrapper = await mountSuspended(MarvRow, { props: { selectNew: true }, global: { stubs: { AppUserAvatar: true, AppMarvMark: true } } })
    const push = vi.spyOn(useNuxtApp().$router, 'push')
    await wrapper.get('a[href="/chat?marv=1"]').trigger('click', { button: 0 })
    await flushPromises()
    expect(wrapper.emitted('select')).toEqual([['marv']])
    expect(push).not.toHaveBeenCalled()
    wrapper.unmount()
  })
})
