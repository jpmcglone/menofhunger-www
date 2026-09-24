import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import NewPostsPill from '~/components/app/feed/NewPostsPill.vue'
import { useFeedScrollToTop } from '~/composables/useFeedScrollToTop'

const { scroller } = vi.hoisted(() => ({ scroller: { value: null as HTMLElement | null } }))
mockNuxtImport('useMiddleScroller', () => () => scroller)

describe('new posts pill interaction', () => {
  it('exposes the count and activates by clicking its button', async () => {
    const wrapper = mount(NewPostsPill, {
      props: { authors: [], count: 4 },
      global: { stubs: { Icon: true, AppAvatarFacepile: true } },
    })
    expect(wrapper.get('button').attributes('aria-label')).toContain('4 new posts')
    expect(wrapper.text()).toContain('New posts')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('reveal')).toHaveLength(1)
    wrapper.unmount()
  })
  it('uses the same accessible reveal action in its full-width row', async () => {
    const wrapper = mount(NewPostsPill, {
      props: { authors: [], count: 1, inline: true },
      global: { stubs: { Icon: true, AppAvatarFacepile: true } },
    })
    expect(wrapper.get('button').classes()).toContain('w-full')
    expect(wrapper.get('button').attributes('aria-label')).toContain('1 new post.')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('reveal')).toHaveLength(1)
    wrapper.unmount()
  })
  it.each([false, true])('scrolls the feed below its sticky tabs, reduced motion=%s', async reduced => {
    const root = document.createElement('div')
    const target = document.createElement('div')
    const header = document.createElement('div')
    root.getBoundingClientRect = () => ({ top: 100 }) as DOMRect
    target.getBoundingClientRect = () => ({ top: -600 }) as DOMRect
    header.getBoundingClientRect = () => ({ height: 52 }) as DOMRect
    root.scrollBy = vi.fn()
    scroller.value = root
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: reduced } as MediaQueryList)
    useFeedScrollToTop(ref(target), ref(header)).scrollToTop()
    await nextTick()
    expect(root.scrollBy).toHaveBeenCalledWith({ top: -752, behavior: reduced ? 'auto' : 'smooth' })
    vi.restoreAllMocks()
    scroller.value = null
  })
})
