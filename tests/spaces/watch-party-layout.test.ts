import { describe, expect, it } from 'vitest'
import { WATCH_CHAT_PINNED_TOP, WATCH_PLAYER_PINNED_HEIGHT } from '~/utils/watchPartyLayout'

describe('watch party pinned layout', () => {
  it('caps 16:9 height so landscape still leaves room for chat', () => {
    expect(WATCH_PLAYER_PINNED_HEIGHT).toContain('56.25vw')
    expect(WATCH_PLAYER_PINNED_HEIGHT).toContain('100dvh')
    expect(WATCH_PLAYER_PINNED_HEIGHT).toContain('12rem')
    expect(WATCH_CHAT_PINNED_TOP).toContain(WATCH_PLAYER_PINNED_HEIGHT)
    expect(WATCH_CHAT_PINNED_TOP).toContain('--moh-safe-top')
  })
})
