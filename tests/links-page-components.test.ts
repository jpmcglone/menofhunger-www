import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import Unavailable from '~/components/app/links/Unavailable.vue'
import LinkButton from '~/components/app/links/LinkButton.vue'
import ConnectedAccountRow from '~/components/app/links/ConnectedAccountRow.vue'
import RecentList from '~/components/app/links/RecentList.vue'
import JoinCard from '~/components/app/links/JoinCard.vue'
import Footer from '~/components/app/links/Footer.vue'
import SettingsProfileLinksSection from '~/components/settings/sections/SettingsProfileLinksSection.vue'
import type { MyConnectedAccount } from '~/types/api'
import type { DraftLink } from '~/utils/profile-links-editor'

const editor = vi.hoisted(() => ({ state: null as null | Record<string, unknown> }))
vi.mock('~/composables/settings/useSettingsLinks', () => ({
  useSettingsLinks: () => editor.state,
}))

const wrappers: VueWrapper[] = []
afterEach(() => {
  while (wrappers.length) wrappers.pop()!.unmount()
})
async function mountIt<T>(component: T, options: Record<string, unknown> = {}) {
  const wrapper = await mountSuspended(component as never, options as never)
  wrappers.push(wrapper as unknown as VueWrapper)
  return wrapper as unknown as VueWrapper
}

const stubs = { AppLinksBrandGlyph: true, AppModal: true, Icon: true }

describe('links page: unavailable state', () => {
  it('says the page is not available and offers a way back into the app', async () => {
    const wrapper = await mountIt(Unavailable, { global: { stubs } })
    expect(wrapper.get('h1').text()).toBe("This page isn't available")
    const cta = wrapper.get('a[href="/explore"]')
    expect(cta.text()).toContain('Explore Men of Hunger')
  })
})

describe('links page: rows', () => {
  it('opens custom links in a new tab without leaking the opener or passing ranking', async () => {
    const link = { id: '1', url: 'https://example.com/x', title: 'Hungry Men podcast', host: 'example.com', icon: 'website' as const }
    const wrapper = await mountIt(LinkButton, { props: { link }, global: { stubs } })
    const a = wrapper.get('a')
    expect(a.attributes('href')).toBe('https://example.com/x')
    expect(a.attributes('target')).toBe('_blank')
    expect(a.attributes('rel')).toBe('noopener noreferrer nofollow')
    expect(a.classes()).toContain('min-h-[52px]')
    expect(a.text()).toContain('Hungry Men podcast')
  })

  it('shows a connected account with follower count and a neutral Connected label', async () => {
    const account = { network: 'x' as const, handle: 'TheMcGloneCode', url: 'https://x.com/TheMcGloneCode', followerCount: 46_949 }
    const wrapper = await mountIt(ConnectedAccountRow, { props: { account }, global: { stubs } })
    expect(wrapper.text()).toContain('@TheMcGloneCode')
    expect(wrapper.text()).toContain('X · 46.9K followers')
    expect(wrapper.text()).toContain('Connected')
    expect(wrapper.find('a').attributes('rel')).toContain('nofollow')
  })

  it('omits the follower line when the count is hidden', async () => {
    const account = { network: 'pickax' as const, handle: 'jp', url: 'https://pickax.com/jp', followerCount: null }
    const wrapper = await mountIt(ConnectedAccountRow, { props: { account }, global: { stubs } })
    expect(wrapper.text()).toContain('Pickax')
    expect(wrapper.text()).not.toContain('followers')
  })

  it('links recent items to real permalinks and the full profile', async () => {
    const items = [
      { kind: 'post' as const, id: 'p1', title: null, excerpt: 'Finished the cold plunge.', createdAt: '2026-10-08T12:00:00.000Z' },
      { kind: 'article' as const, id: 'a1', title: 'Why every man needs a lodge', excerpt: 'x', createdAt: '2026-10-06T12:00:00.000Z' },
    ]
    const wrapper = await mountIt(RecentList, { props: { items, username: 'john', firstName: 'John' }, global: { stubs } })
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'))
    expect(hrefs).toEqual(['/p/p1', '/a/a1', '/u/john'])
    expect(wrapper.text()).toContain('See all posts by John')
    expect(wrapper.text()).toContain('Oct 6')
  })
})

describe('links page: join and footer', () => {
  const user = {
    id: 'u1', username: 'john', name: 'John McGlone', bio: null, locationDisplay: null,
    verifiedStatus: 'identity' as const, isOrganization: false, premium: false, premiumPlus: false, avatarUrl: null,
  }

  it('invites with the owner name and carries attribution in the join link', async () => {
    const wrapper = await mountIt(JoinCard, {
      props: { user, firstName: 'John', joinHref: '/login?src=links_page&ref=JOHN' },
      global: { stubs: { ...stubs, AppAvatarCircle: true } },
    })
    expect(wrapper.text()).toContain('John invited you to Men of Hunger')
    expect(wrapper.find('a[href="/login?src=links_page&ref=JOHN"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/login"]').text()).toBe('Log in')
  })

  it('sends signed-in visitors to the editor and signed-out visitors to login', async () => {
    const authed = await mountIt(Footer, { props: { isAuthed: true }, global: { stubs } })
    expect(authed.find('a[href="/settings/links"]').exists()).toBe(true)
    const anon = await mountIt(Footer, { props: { isAuthed: false }, global: { stubs } })
    expect(anon.find('a[href="/login?src=links_page"]').exists()).toBe(true)
    expect(anon.find('a[href="/privacy"]').exists()).toBe(true)
  })

  it('emits report from a button, not a link', async () => {
    const wrapper = await mountIt(Footer, { props: { isAuthed: false }, global: { stubs } })
    await wrapper.findAll('button').find((b) => b.text() === 'Report')!.trigger('click')
    expect(wrapper.emitted('report')).toHaveLength(1)
  })
})

describe('settings: links editor', () => {
  const draft = (key: string, title: string, extra: Partial<DraftLink> = {}): DraftLink => ({
    key, id: key, url: `https://${key}.example`, title, host: `${key}.example`, icon: 'website',
    grandfathered: false, hiddenUntilVerified: false, ...extra,
  })
  const account: MyConnectedAccount = {
    network: 'x', handle: 'jp', url: 'https://x.com/jp', followerCount: 1200, supportsFollowerCount: true, showFollowerCount: true,
  }

  function setEditor(overrides: { canAdd: boolean; drafts: DraftLink[] }) {
    const calls = { moveBy: vi.fn(), removeLink: vi.fn(), save: vi.fn(), setShowFollowerCount: vi.fn(), load: vi.fn() }
    editor.state = {
      loaded: ref(true), loading: ref(false), loadError: ref(null),
      connectedAccounts: ref([account]), canAddCustomLinks: ref(overrides.canAdd), maxLinks: ref(10), path: ref('/u/jp/links'),
      drafts: ref(overrides.drafts), dirty: ref(true), atLimit: ref(false), hasHiddenLinks: ref(false),
      saving: ref(false), saveError: ref(null), justSaved: ref(false), followerToggleError: ref(null),
      load: calls.load, addLink: vi.fn(() => true), updateLink: vi.fn(), removeLink: calls.removeLink,
      moveBy: calls.moveBy, moveTo: vi.fn(), save: calls.save, setShowFollowerCount: calls.setShowFollowerCount,
    }
    return calls
  }

  beforeEach(() => { editor.state = null })

  it('lets a verified member reorder with buttons, edit, remove, add, and save', async () => {
    const calls = setEditor({ canAdd: true, drafts: [draft('one', 'First'), draft('two', 'Second', { hiddenUntilVerified: true })] })
    const wrapper = await mountIt(SettingsProfileLinksSection, { global: { stubs: { ...stubs, AppLinksShareLinksPageDialog: true } } })
    expect(wrapper.text()).not.toContain('Verify to add custom links')
    expect(wrapper.text()).toContain('Add a link')
    expect(wrapper.text()).toContain('Hidden until you')
    expect(calls.load).toHaveBeenCalled()

    const up = wrapper.get('button[aria-label="Move Second up"]')
    await up.trigger('click')
    expect(calls.moveBy).toHaveBeenCalledWith('two', -1)
    expect(wrapper.get('button[aria-label="Move First up"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button[aria-label="Move Second down"]').attributes('disabled')).toBeDefined()

    await wrapper.get('button[aria-label="Remove First"]').trigger('click')
    expect(calls.removeLink).toHaveBeenCalledWith('one')

    expect(wrapper.find('button[aria-label="Edit First"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Save links')
    expect(wrapper.text()).toContain('2 of 10')
  })

  it('locks custom links behind verification but still shows connected accounts', async () => {
    setEditor({ canAdd: false, drafts: [draft('one', 'Grandfathered')] })
    const wrapper = await mountIt(SettingsProfileLinksSection, { global: { stubs: { ...stubs, AppLinksShareLinksPageDialog: true } } })
    expect(wrapper.text()).toContain('Verify to add custom links')
    const cta = wrapper.get('a[href="/settings/verification"]')
    expect(cta.text()).toContain('Get verified')
    expect(wrapper.text()).toContain('@jp')
    expect(wrapper.text()).toContain('Grandfathered')
    expect(wrapper.text()).not.toContain('Add a link')
    expect(wrapper.text()).not.toContain('Save links')
    expect(wrapper.find('button[aria-label^="Move "]').exists()).toBe(false)
    expect(wrapper.find('button[aria-label^="Remove "]').exists()).toBe(false)
  })

  it('offers preview and share for any member', async () => {
    setEditor({ canAdd: false, drafts: [] })
    const wrapper = await mountIt(SettingsProfileLinksSection, { global: { stubs: { ...stubs, AppLinksShareLinksPageDialog: true } } })
    expect(wrapper.find('a[href="/u/jp/links"]').text()).toContain('Preview as a visitor')
    expect(wrapper.text()).toContain('Share links page')
  })
})
