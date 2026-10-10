import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { useActivityToastRoom } from '~/composables/useActivityToastRoom'
const desktop = ref(true)
const sessions = ref<unknown[]>([])
const listExpanded = ref(false)
const fullHostReady = ref(false)
vi.mock('~/composables/chat/useDesktopChatDock', () => ({ useDesktopChatDock: () => ({ desktop, sessions, listExpanded, fullHostReady }) }))
let room: ReturnType<typeof useActivityToastRoom>
let wrapper: Awaited<ReturnType<typeof mountSuspended>>
let left = 600
const Host = defineComponent({ setup() { room = useActivityToastRoom(); return () => null } })
beforeEach(async () => {
  desktop.value = true; sessions.value = []; listExpanded.value = false; fullHostReady.value = false; left = 600
  vi.stubGlobal('innerHeight', 900)
  vi.stubGlobal('innerWidth', 1500)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 1 })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
  const dock = document.createElement('div'); dock.className = 'moh-chat-dock-window'; document.body.append(dock)
  vi.spyOn(dock, 'getClientRects').mockImplementation(() => [new DOMRect(left, 300, 900, 576)] as unknown as DOMRectList)
  vi.spyOn(dock, 'getBoundingClientRect').mockImplementation(() => new DOMRect(left, 300, 900, 576))
  wrapper = await mountSuspended(Host)
})
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals() })
describe('optional activity overlay room', () => {
  it('uses actual dock rectangles rather than assuming a desktop has spare room', async () => {
    expect(room.value).toBe(true)
    left = 350; listExpanded.value = true; await nextTick(); await nextTick()
    expect(room.value).toBe(false)
    left = 500; listExpanded.value = false; await nextTick(); await nextTick()
    expect(room.value).toBe(true)
  })
  it('suppresses non-desktop devices and short windows', async () => {
    desktop.value = false; await nextTick(); await nextTick(); expect(room.value).toBe(false)
    desktop.value = true; vi.stubGlobal('innerHeight', 500); await nextTick(); await nextTick(); expect(room.value).toBe(false)
  })
})
