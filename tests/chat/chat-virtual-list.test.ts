import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { useChatVirtualList } from '~/composables/chat/useChatVirtualList'
import type { ChatListItem } from '~/composables/chat/useChatTimeFormatting'

function message(index: number): ChatListItem {
  return { type: 'message', key: `message-${index}`, index, createdAtMs: index,
    message: { id: `message-${index}`, body: 'text', media: [] } as any }
}

describe('chat history window', () => {
  it('bounds mounted rows and mounts an off-screen reply target', async () => {
    const scroller = document.createElement('div')
    Object.defineProperties(scroller, {
      offsetHeight: { value: 600 }, offsetWidth: { value: 400 },
      clientHeight: { value: 600 }, scrollHeight: { value: 88000 },
    })
    scroller.scrollTo = ((opts: ScrollToOptions) => {
      scroller.scrollTop = opts.top ?? 0
      scroller.dispatchEvent(new Event('scroll'))
    }) as typeof scroller.scrollTo
    document.body.appendChild(scroller)
    const items = ref<ChatListItem[]>(Array.from({ length: 1000 }, (_, i) => message(i)))
    let list!: ReturnType<typeof useChatVirtualList>
    const wrapper = mount(defineComponent({ setup() {
      list = useChatVirtualList(items, ref(scroller))
      return () => h('div', list.rows.value.map((row) => h('div', { key: String(row.key), 'data-message-id': row.item.key })))
    } }), { attachTo: scroller })
    try {
      await nextTick()
      expect(list.rows.value.length).toBeGreaterThan(0)
      expect(list.rows.value.length).toBeLessThan(30)
      expect(await list.scrollToMessage('message-800')).toBe(true)
      await nextTick()
      expect(list.rows.value.some((row) => row.item.key === 'message-800')).toBe(true)
      expect(wrapper.findAll('[data-message-id]').length).toBeLessThan(30)
      expect(await list.scrollToMessage('missing')).toBe(false)
      items.value = [...Array.from({ length: 50 }, (_, i) => message(-i - 1)).reverse(), ...items.value]
      await nextTick()
      await list.scrollToMessage('message-800')
      expect(list.rows.value.some((row) => row.item.key === 'message-800')).toBe(true)
    } finally {
      wrapper.unmount()
      scroller.remove()
    }
  })
})
