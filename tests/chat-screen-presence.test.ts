import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useChatScreenPresence } from '../composables/chat/useChatScreenPresence'

afterEach(() => vi.restoreAllMocks())

describe('chat screen presence', () => {
  it('clears viewing on blur/hide, restores selection on focus, and cleans up', () => {
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
    focused = false
    window.dispatchEvent(new Event('blur'))
    expect(emit).toHaveBeenLastCalledWith(false, null)
    select(true, 'c2') // Selection/reconnect while backgrounded must stay inactive.
    expect(emit).toHaveBeenLastCalledWith(false, null)
    focused = true
    window.dispatchEvent(new Event('focus'))
    expect(emit).toHaveBeenLastCalledWith(true, 'c2')
    visibility = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(emit).toHaveBeenLastCalledWith(false, null)
    visibility = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    expect(emit).toHaveBeenLastCalledWith(true, 'c2')
    wrapper.unmount()
    expect(emit).toHaveBeenLastCalledWith(false)
    emit.mockClear()
    window.dispatchEvent(new Event('focus'))
    select(true, 'late-async-selection')
    expect(emit).not.toHaveBeenCalled()
  })
})
