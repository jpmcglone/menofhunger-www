import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import type { DOMWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ShortcutModal from '~/components/app/dialogs/AppKeyboardShortcutsModal.vue'
import { ALL_SHORTCUTS, useKeyboardShortcuts } from '~/composables/useKeyboardShortcuts'
import { useKeyboardShortcutsHandler } from '~/composables/useKeyboardShortcutsHandler'

const shortcutMocks = vi.hoisted(() => ({
  search: vi.fn(), compose: vi.fn(), nextPost: vi.fn(), previousPost: vi.fn(), reply: vi.fn(),
  previousMedia: vi.fn(), nextMedia: vi.fn(), radio: vi.fn(),
  colorMode: { preference: 'system' },
}))
mockNuxtImport('useAuth', () => () => ({ user: ref({ username: 'john' }) }))
mockNuxtImport('useColorMode', () => () => shortcutMocks.colorMode)
mockNuxtImport('useSpaceAudio', () => () => ({ toggle: shortcutMocks.radio }))
mockNuxtImport('useKeyboardShortcutsFocusedPost', () => () => ({
  focusNext: shortcutMocks.nextPost, focusPrev: shortcutMocks.previousPost, replyToFocused: shortcutMocks.reply,
}))

let view: Awaited<ReturnType<typeof mountSuspended>> | undefined
let state: ReturnType<typeof useKeyboardShortcuts>
let router: ReturnType<typeof useRouter>

async function mountShortcuts() {
  view = await mountSuspended(defineComponent({
    setup() {
      state = useKeyboardShortcuts()
      state.showModal.value = true
      router = useRouter()
      useKeyboardShortcutsHandler({ focusSearch: shortcutMocks.search, openComposer: shortcutMocks.compose })
      return () => h(ShortcutModal, { previousMedia: shortcutMocks.previousMedia, nextMedia: shortcutMocks.nextMedia })
    },
  }), {
    global: {
      stubs: {
        AppModal: { props: ['modelValue'], template: '<div v-if="modelValue" role="dialog"><slot /></div>' },
      },
    },
  })
}

async function clickRow(label: string, modifiers = {}) {
  const row = view!.findAll('button, a').find((row: DOMWrapper<Element>) => row.text().startsWith(label))
  expect(row, `Missing shortcut row: ${label}`).toBeDefined()
  await row!.trigger('click', modifiers)
  await nextTick()
}

function key(key: string, extra: KeyboardEventInit = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }))
}

beforeEach(() => {
  for (const mock of Object.values(shortcutMocks)) {
    if (vi.isMockFunction(mock)) mock.mockReset()
  }
  shortcutMocks.colorMode.preference = 'system'
})
afterEach(() => {
  view?.unmount()
  view = undefined
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  vi.restoreAllMocks()
})

describe('clickable keyboard shortcuts', () => {
  it.each([
    ['Focus search', 'search'], ['New post', 'compose'], ['Next post', 'nextPost'],
    ['Previous post', 'previousPost'], ['Reply to focused post', 'reply'],
    ['Previous media', 'previousMedia'], ['Next media', 'nextMedia'], ['Play / pause radio', 'radio'],
  ] as const)('%s invokes its existing action after dismissing the modal', async (label, mockName) => {
    await mountShortcuts()
    shortcutMocks[mockName].mockImplementation(() => expect(state.showModal.value).toBe(false))
    await clickRow(label)
    expect(shortcutMocks[mockName]).toHaveBeenCalledTimes(1)
    expect(state.showModal.value).toBe(false)
    expect(view!.find('[role="dialog"]').exists()).toBe(false)
  })

  it.each(['Close / dismiss', 'Show keyboard shortcuts'])('%s dismisses the open modal', async (label) => {
    await mountShortcuts()
    await clickRow(label)
    expect(state.showModal.value).toBe(false)
  })

  it('cycles the theme using the existing system → dark → light → system order', async () => {
    await mountShortcuts()
    for (const preference of ['dark', 'light', 'system']) {
      state.showModal.value = true
      await nextTick()
      await clickRow('Cycle theme')
      expect(shortcutMocks.colorMode.preference).toBe(preference)
      expect(state.showModal.value).toBe(false)
    }
  })

  it.each(['MacIntel', 'Win32'])('shows the theme chord for %s and keeps G shortcuts as sequences', async (platform) => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform)
    await mountShortcuts()
    const theme = view!.findAll('button').find((row: DOMWrapper<Element>) => row.text().startsWith('Cycle theme'))!
    expect(theme.findAll('kbd').map((key: DOMWrapper<Element>) => key.text())).toEqual([platform === 'MacIntel' ? '⌘' : 'Ctrl', 'Shift', '.'])
    expect(theme.text()).toContain('+')
    const home = view!.get('a[href="/home"]')
    expect(home.text()).toContain('then')
  })

  it('renders every navigation shortcut as a real link and dismisses on activation', async () => {
    await mountShortcuts()
    const routes: Record<string, string> = {
      home: '/home', explore: '/explore', notifications: '/notifications', chat: '/chat',
      spaces: '/spaces', groups: '/groups', bookmarks: '/bookmarks', profile: '/u/john',
      onlyMe: '/only-me', radio: '/radio', settings: '/settings',
    }
    for (const shortcut of ALL_SHORTCUTS.filter((shortcut) => routes[shortcut.action])) {
      state.showModal.value = true
      await nextTick()
      expect(view!.get(`a[href="${routes[shortcut.action]}"]`).exists()).toBe(true)
      await clickRow(shortcut.label)
      expect(state.showModal.value).toBe(false)
    }
  })

  it('preserves modified-click navigation without pushing the current tab', async () => {
    await mountShortcuts()
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)
    await clickRow('Go to Home', { metaKey: true })
    expect(push).not.toHaveBeenCalled()
    expect(state.showModal.value).toBe(false)
  })

  it('uses the same actions for keyboard shortcuts, suppresses typing and modal-open shortcuts, and clears pending sequences', async () => {
    await mountShortcuts()
    key('n')
    expect(shortcutMocks.compose).not.toHaveBeenCalled()
    state.showModal.value = false
    await nextTick()
    for (const value of ['/', 'n', 'j', 'k', 'r']) key(value)
    for (const name of ['search', 'compose', 'nextPost', 'previousPost', 'reply'] as const) {
      expect(shortcutMocks[name]).toHaveBeenCalledTimes(1)
    }
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)
    key('g')
    key('h')
    expect(push).toHaveBeenCalledWith('/home')
    const input = document.createElement('input')
    document.body.append(input)
    input.focus()
    key('n')
    expect(shortcutMocks.compose).toHaveBeenCalledTimes(1)
    input.remove()
    key('g')
    key('?')
    expect(state.showModal.value).toBe(true)
    key('?')
    expect(state.showModal.value).toBe(false)
    key('n')
    expect(shortcutMocks.compose).toHaveBeenCalledTimes(2)
  })
})
