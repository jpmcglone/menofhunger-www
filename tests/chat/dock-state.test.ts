import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { useDesktopChatDock } from '~/composables/chat/useDesktopChatDock'
import { canAutoOpenConversation, isDesktopChatDevice, openDockSession, type DockSession } from '~/utils/chat-dock'
import type { MessageConversation } from '~/types/api'

const conversation = { id: 'a', type: 'direct', viewerStatus: 'accepted', isMuted: false } as MessageConversation
const state = vi.hoisted(() => ({ refs: new Map<string, ReturnType<typeof ref>>() }))
mockNuxtImport('useState', () => (key: string, init: () => unknown) => {
  if (!state.refs.has(key)) state.refs.set(key, ref(init()))
  return state.refs.get(key)
})
mockNuxtImport('useHydratedMediaQuery', () => () => ref(true))

describe('personal desktop chat dock', () => {
  it('excludes narrow screens, coarse pointers and iPads including Mac UA with a trackpad', () => {
    expect(isDesktopChatDevice(1440, true, 'Mac', 'MacIntel', 0)).toBe(true)
    expect(isDesktopChatDevice(1024, true, 'Windows', 'Win32', 0)).toBe(true)
    expect(isDesktopChatDevice(1023, true, 'Mac', 'MacIntel', 0)).toBe(false)
    expect(isDesktopChatDevice(1440, false, 'Windows', 'Win32', 0)).toBe(false)
    expect(isDesktopChatDevice(1440, true, 'iPad', 'iPad', 0)).toBe(false)
    expect(isDesktopChatDevice(1440, true, 'Macintosh Safari', 'MacIntel', 5)).toBe(false)
  })

  it('keeps distinct sessions and uses overflow without losing conversation identity', () => {
    let sessions: DockSession[] = []
    sessions = openDockSession(sessions, 'a', 2)
    sessions = openDockSession(sessions, 'b', 2)
    expect(sessions.filter(session => session.mode === 'expanded').map(session => session.conversationId)).toEqual(['a', 'b'])
    sessions = openDockSession(sessions, 'c', 2)
    expect(sessions.find(session => session.key === 'a')?.mode).toBe('minimized')
    expect(sessions.filter(session => session.mode === 'expanded').map(session => session.conversationId)).toEqual(['b', 'c'])
    sessions = openDockSession(sessions, 'a', 2)
    expect(sessions.filter(session => session.key === 'a')).toHaveLength(1)
    expect(sessions.at(-1)?.mode).toBe('expanded')
  })

  it('never reopens intentional minimizes/closes and arrivals never displace an open conversation', () => {
    const minimized = [{ ...openDockSession([], 'a', 1)[0]!, mode: 'minimized' as const }]
    const closed = [{ ...minimized[0]!, mode: 'closed' as const }]
    expect(openDockSession(minimized, 'a', 1, true)).toBe(minimized)
    expect(openDockSession(closed, 'a', 1, true)).toBe(closed)
    const active = openDockSession([], 'b', 1)
    expect(openDockSession(active, 'a', 1, true)).toBe(active)
    const twoSlots = openDockSession(active, 'a', 2, true)
    expect(twoSlots.map(session => session.mode)).toEqual(['expanded', 'expanded'])
  })

  it('accepts incoming unmuted DM/group DM only in a visible focused page', () => {
    expect(canAutoOpenConversation(conversation, 'other', 'me', true)).toBe(true)
    expect(canAutoOpenConversation({ ...conversation, type: 'group' }, 'other', 'me', true)).toBe(true)
    for (const changed of [{ isMuted: true }, { isBlockedWith: true }, { viewerStatus: 'pending' }, { type: 'crew_wall' }]) {
      expect(canAutoOpenConversation({ ...conversation, ...changed } as MessageConversation, 'other', 'me', true)).toBe(false)
    }
    expect(canAutoOpenConversation(conversation, 'me', 'me', true)).toBe(false)
    expect(canAutoOpenConversation(conversation, 'other', 'me', false)).toBe(false)
    expect(canAutoOpenConversation(undefined, 'other', 'me', true)).toBe(false)
  })

  it('deduplicates a MARV draft once the real conversation is created', () => {
    const sessions = openDockSession([], 'marv', 2)
    sessions[0]!.conversationId = 'marv-dm'
    const opened = openDockSession(sessions, 'marv-dm', 2)
    expect(opened).toHaveLength(1)
    expect(opened[0]!.key).toBe('marv')
    expect(opened[0]!.conversationId).toBe('marv-dm')
  })
  it('does not count a full-page crew thread as a personal dock slot', () => {
    const crew = [{ ...openDockSession([], 'crew', 1)[0]!, dockable: false }]
    const incoming = openDockSession(crew, 'a', 1, true)
    expect(incoming.find(session => session.key === 'a')?.mode).toBe('expanded')
    const openedCrew = openDockSession(incoming, 'crew', 1)
    expect(openedCrew.find(session => session.key === 'a')?.mode).toBe('expanded')
  })
  it('centrally minimizes MARV when asked to close while ordinary DMs can close', () => {
    state.refs.clear()
    const dock = useDesktopChatDock()
    dock.open('marv')
    dock.focusedKey.value = 'marv'
    dock.setMode('marv', 'closed')
    expect(dock.sessions.value.find(session => session.key === 'marv')?.mode).toBe('minimized')
    expect(dock.focusedKey.value).toBeNull()
    dock.open('dm'); dock.setMode('dm', 'closed')
    expect(dock.sessions.value.find(session => session.key === 'dm')?.mode).toBe('closed')
  })
})
