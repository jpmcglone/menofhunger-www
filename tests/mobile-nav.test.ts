import { ref, type Ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppNav } from '~/composables/useAppNav'

const fixture = vi.hoisted(() => ({ authed: null as unknown as Ref<boolean> }))
mockNuxtImport('useAuth', () => () => ({ user: ref({ username: 'member' }), isAuthed: fixture.authed, isVerified: ref(true), isPremium: ref(false), isPageAccount: ref(false) }))
mockNuxtImport('useAppFeatures', () => () => ({ hasFeature: () => true }))
mockNuxtImport('useSpaceLobby', () => () => ({ selectedSpaceId: ref(null) }))
mockNuxtImport('useSpaces', () => () => ({ getById: () => null }))
mockNuxtImport('useSpaceAudio', () => () => ({ activeSpaceId: ref(null), isPlaying: ref(false) }))
mockNuxtImport('useViewerCrew', () => () => ({ membership: ref(null), ensureLoaded: vi.fn() }))
beforeEach(() => { fixture.authed = ref(true) })
describe('mobile navigation', () => {
  it('orders the six tabs and keeps Board available behind More', () => {
    const nav = useAppNav()
    expect(nav.tabItems.value.map(item => item.label)).toEqual(['Home', 'Search', 'Groups', 'Notifications', 'Chat', 'More'])
    expect(nav.tabItems.value.map(item => item.to)).toEqual(['/home', '/explore', '/groups', '/notifications', '/chat', '/more'])
    const overflow = nav.primaryItems.value.filter(item => !nav.tabItems.value.some(tab => tab.key === item.key))
    expect(overflow.find(item => item.key === 'board')?.to).toBe('/b')
    expect(nav.primaryItems.value.find(item => item.key === 'explore')?.label).toBe('Explore')
  })
  it('preserves signed-out visibility gates', () => {
    fixture.authed.value = false
    expect(useAppNav().tabItems.value.map(item => item.label)).toEqual(['Home', 'Search', 'Groups', 'More'])
  })
})
