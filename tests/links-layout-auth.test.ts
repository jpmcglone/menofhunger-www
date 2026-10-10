import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, nextTick, onMounted, ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import LinksLayout from '~/layouts/links.vue'

const session = vi.hoisted(() => ({ user: null as unknown, init: vi.fn(), load: vi.fn() }))
mockNuxtImport('useAuth', () => () => {
  const user = session.user as ReturnType<typeof ref<{ id: string } | null>>
  return {
    user,
    isAuthed: computed(() => Boolean(user.value?.id)),
    initAuth: session.init,
  }
})

let wrapper: VueWrapper | undefined
beforeEach(() => {
  session.user = ref(null)
  session.load.mockReset()
  session.init.mockReset()
  session.init.mockImplementation(async () => {
    // Match useAuth's client bootstrap: do not change identity during hydration.
    onMounted(() => { void session.load() })
  })
})
afterEach(() => { wrapper?.unmount() })

async function render() {
  wrapper = await mountSuspended(LinksLayout, {
    slots: { default: '<h1>Public links</h1>' },
    global: { stubs: { Button: { props: ['to', 'label'], template: '<a :href="to">{{ label }}</a>' } } },
  })
  return wrapper
}

describe('public links layout session recognition', () => {
  it('initializes the session and replaces the guest CTA once identity is loaded', async () => {
    const view = await render()
    expect(session.init).toHaveBeenCalledTimes(1)
    expect(session.load).toHaveBeenCalledTimes(1)
    expect(view.text()).toContain('Join free')
    ;(session.user as ReturnType<typeof ref>).value = { id: 'member' }
    await nextTick()
    expect(view.text()).toContain('Back to Men of Hunger')
    expect(view.text()).not.toContain('Join free')
    expect(view.findAll('a[href="/home"]')).toHaveLength(2)
    expect(view.get('h1').text()).toBe('Public links')
  })

  it('uses the server-provided identity on first render', async () => {
    session.user = ref({ id: 'member' })
    const view = await render()
    expect(view.text()).toContain('Back to Men of Hunger')
    expect(view.text()).not.toContain('Join free')
    expect(view.findAll('a[href="/home"]')).toHaveLength(2)
  })

  it('keeps anonymous visitors on the public page with a real link to Men of Hunger', async () => {
    const view = await render()
    expect(view.get('a[href="/"]').text()).toBe('Men of Hunger')
    expect(view.text()).toContain('Join free')
    expect(view.get('h1').text()).toBe('Public links')
  })

})
