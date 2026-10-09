import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VueWrapper } from '@vue/test-utils'
import Hero from '~/components/app/feed/DailyCheckinHero.vue'

const state = vi.hoisted(() => ({ window: null as any }))
mockNuxtImport('useCheckinWindow', () => () => ({ isOpen: state.window }))
mockNuxtImport('useAuth', () => () => ({ isAuthed: ref(true) }))
mockNuxtImport('useEasternMidnightRollover', () => () => ({ dayKey: ref('2026-10-09') }))
vi.mock('~/composables/presence/usePresenceCallback', () => ({ usePresenceCallback: () => ({ register: vi.fn() }) }))
let view: VueWrapper | undefined
beforeEach(() => { state.window = ref(true) })
afterEach(() => view?.unmount())

async function render(props: Record<string, unknown> = {}) {
  view = await mountSuspended(Hero, { props: { prompt: 'What did you learn today?', canAnswer: true, ...props }, global: { stubs: { Icon: true, NuxtLink: { template: '<a><slot /></a>' } } } })
  return view
}

describe('Home check-in hero', () => {
  it('hides outside the window and returns the Answer action when the window opens', async () => {
    state.window.value = false
    const page = await render()
    expect(page.find('section').exists()).toBe(false)
    expect(page.text()).not.toContain('Check-ins open at')
    state.window.value = true
    await page.vm.$nextTick()
    expect(page.text()).toContain('What did you learn today?')
    expect(page.findAll('button').some(button => button.text() === 'Answer')).toBe(true)
    state.window.value = false
    await page.vm.$nextTick()
    expect(page.find('section').exists()).toBe(false)
  })

  it('preserves the answered snippet, streak and weekly mission', async () => {
    const page = await render({ compact: true, myCheckinBody: 'I learned to ask for help.', state: { dayKey: '2026-10-09', checkinStreakDays: 14 } })
    expect(page.text()).toContain('Check-in answered')
    expect(page.text()).toContain('14d')
    expect(page.text()).toContain('7/7')
    expect(page.text()).toContain('I learned to ask for help.')
    expect(page.text()).toContain('Next prompt tomorrow')
  })
})
