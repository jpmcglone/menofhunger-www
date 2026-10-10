import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref, watch } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useChatScreenPresence } from '../composables/chat/useChatScreenPresence'

afterEach(() => vi.restoreAllMocks())

describe('chat screen presence', () => {
  it('clears viewing on blur/hide, restores selection on focus, and cleans up', async () => {
    const emit = vi.fn()
    let focused = true
    let visibility = 'visible'
    vi.spyOn(document, 'hasFocus').mockImplementation(() => focused)
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility as DocumentVisibilityState)
    let select!: ReturnType<typeof useChatScreenPresence>
    const wrapper = mount(defineComponent({
      setup() { select = useChatScreenPresence(emit); return () => null },
    }))
    select(true, 'c1')
    expect(emit).toHaveBeenLastCalledWith(true, 'c1')
    const count = emit.mock.calls.length
    select(true, 'c1')
    window.dispatchEvent(new Event('focus'))
    await nextTick(); await nextTick()
    expect(emit.mock.calls).toHaveLength(count)
    focused = false
    window.dispatchEvent(new Event('blur'))
    expect(emit).toHaveBeenLastCalledWith(false, null)
    select(true, 'c2') // Selection/reconnect while backgrounded must stay inactive.
    expect(emit).toHaveBeenLastCalledWith(false, null)
    focused = true
    window.dispatchEvent(new Event('focus'))
    await nextTick(); await nextTick()
    expect(emit).toHaveBeenLastCalledWith(true, 'c2')
    visibility = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(emit).toHaveBeenLastCalledWith(false, null)
    visibility = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick(); await nextTick()
    expect(emit).toHaveBeenLastCalledWith(true, 'c2')
    wrapper.unmount()
    expect(emit).toHaveBeenLastCalledWith(false)
    emit.mockClear()
    window.dispatchEvent(new Event('focus'))
    select(true, 'late-async-selection')
    expect(emit).not.toHaveBeenCalled()
  })
  it('a background dock owner cannot clear the focused full route, including teardown', () => {
    const emit = vi.fn()
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    let full!: ReturnType<typeof useChatScreenPresence>
    let dock!: ReturnType<typeof useChatScreenPresence>
    const fullWrapper = mount(defineComponent({ setup() { full = useChatScreenPresence(emit); return () => null } }))
    full(true, 'full-conversation')
    const dockWrapper = mount(defineComponent({ setup() { dock = useChatScreenPresence(emit); return () => null } }))
    dock(false)
    window.dispatchEvent(new Event('focus'))
    expect(emit).toHaveBeenLastCalledWith(true, 'full-conversation')
    dockWrapper.unmount()
    expect(emit).toHaveBeenLastCalledWith(true, 'full-conversation')
    fullWrapper.unmount()
    expect(emit).toHaveBeenLastCalledWith(false)
  })

  it('breaks transport read echoes instead of republishing unchanged viewing state', async () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const readRevision = ref(0)
    const emit = vi.fn((active: boolean) => { if (active) readRevision.value++ })
    let select!: ReturnType<typeof useChatScreenPresence>
    const wrapper = mount(defineComponent({ setup() {
      select = useChatScreenPresence(emit)
      watch(readRevision, () => select(true, 'one'))
      return () => null
    } }))
    select(true, 'one')
    await nextTick()
    expect(readRevision.value).toBe(1)
    expect(emit.mock.calls.filter(call => call[0])).toHaveLength(1)
    wrapper.unmount()
  })

  it('does not restore viewing before focus catch-up invalidates and then paints its fresh window', async () => {
    let focused = true
    vi.spyOn(document, 'hasFocus').mockImplementation(() => focused)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    const ready = ref(true)
    const emit = vi.fn()
    let select!: ReturnType<typeof useChatScreenPresence>
    const wrapper = mount(defineComponent({ setup() {
      select = useChatScreenPresence(emit)
      watch(ready, value => select(value, 'one'), { flush: 'sync' })
      return () => null
    } }))
    select(true, 'one')
    focused = false; window.dispatchEvent(new Event('blur'))
    emit.mockClear()
    const catchUp = () => { ready.value = false }
    window.addEventListener('focus', catchUp)
    focused = true; window.dispatchEvent(new Event('focus'))
    await nextTick(); await nextTick()
    expect(emit.mock.calls.some(call => call[0])).toBe(false)
    await nextTick(); ready.value = true
    expect(emit).toHaveBeenLastCalledWith(true, 'one')
    window.removeEventListener('focus', catchUp)
    wrapper.unmount()
  })

})
