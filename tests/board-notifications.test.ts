import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFromRepo(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('Board and Articles notification dots', () => {
  it('keeps nav unread counts live from the socket and the unread-count seed', () => {
    const badges = readFromRepo('composables/presence/usePresenceBadges.ts')
    const seed = readFromRepo('composables/useNotificationsBadge.ts')
    expect(badges).toContain(`socket.on('notifications:navUnreadChanged'`)
    expect(seed).toContain('setNotificationNavUnread(res?.data ?? {})')
  })

  it('shows a dot, not a number, on Board and Articles in every nav surface', () => {
    for (const path of ['components/app/layout/LeftRail.vue', 'components/app/TabBar.vue']) {
      const source = readFromRepo(path)
      expect(source.match(/<AppNavUnreadDot /g)?.length).toBeGreaterThanOrEqual(2)
    }
    expect(readFromRepo('components/app/TabBar.vue')).toContain('moreHasDot')
  })
})

describe('Board filters', () => {
  it('use the shared filter menu, teleported so nothing clips it, instead of native selects', () => {
    const page = readFromRepo('pages/b/index.vue')
    const bar = readFromRepo('components/app/board/FiltersBar.vue')
    expect(page).toContain('<AppBoardFiltersBar')
    expect(page).not.toContain('<select')
    expect(bar).toContain('<Teleport to="body">')
    expect(bar).toContain('useMenuPosition()')
  })

  it('offers a way back to hidden threads', () => {
    const page = readFromRepo('pages/b/index.vue')
    expect(page).toContain(`hidden: showHidden.value ? 'only' as const : null`)
  })
})

describe('opening a Board thread reads its notifications', () => {
  it('marks the whole thread read from the thread and comment permalink pages', () => {
    for (const path of ['pages/b/[id]/index.vue', 'pages/b/[id]/c/[commentId].vue']) {
      const source = readFromRepo(path)
      expect(source).toContain('markReadBySubject({ board_thread_id:')
      expect(source).toMatch(/onActivated\(\(\) => \{[\s\S]*markThreadRead\(\)/)
    }
  })

  it('clears matching inbox rows when another tab reads the thread', () => {
    const source = readFromRepo('composables/useNotifications.ts')
    expect(source).toContain('n.boardThreadId && clearedThreads.has(n.boardThreadId)')
    expect(source).toContain('payload.clearedBoardThreadIds')
  })
})
