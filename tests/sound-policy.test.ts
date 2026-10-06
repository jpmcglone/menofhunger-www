import { beforeEach, describe, expect, it } from 'vitest'
import { SOUND_CATALOG, channelSoundFor, claimSoundSlot, othersReactionCount, resetSoundPolicyForTests, suppressSoundsFor } from '../utils/sound-policy'

const now = Date.parse('2026-10-06T12:00:10Z')
const base = {
  message: { id: 'm1', createdAt: '2026-10-06T12:00:08Z', threadRootId: null, sender: { id: 'other' } },
  channel: { id: 'c1', preference: 'all' as const, personalCount: 0 },
  priorPersonalCount: 0,
  isKnownMessage: false,
  meId: 'me',
  viewingChannelId: null,
  now,
}

describe('channelSoundFor', () => {
  it('ticks for an ordinary message in another channel', () => {
    expect(channelSoundFor(base)).toBe('channel-message')
  })
  it('pings when the personal count rises', () => {
    expect(channelSoundFor({ ...base, channel: { ...base.channel, personalCount: 1 } })).toBe('channel-mention')
  })
  it('stays quiet for default mentions-only channels without a mention', () => {
    expect(channelSoundFor({ ...base, channel: { ...base.channel, preference: 'mentions' } })).toBeNull()
  })
  it('is silent for muted, own, known, stale, and viewed messages', () => {
    const personal = { ...base.channel, personalCount: 1 }
    expect(channelSoundFor({ ...base, channel: { ...personal, preference: 'off' } })).toBeNull()
    expect(channelSoundFor({ ...base, message: { ...base.message, sender: { id: 'me' } } })).toBeNull()
    expect(channelSoundFor({ ...base, isKnownMessage: true })).toBeNull()
    expect(channelSoundFor({ ...base, message: { ...base.message, createdAt: '2026-10-06T11:00:00Z' } })).toBeNull()
    expect(channelSoundFor({ ...base, channel: personal, viewingChannelId: 'c1' })).toBeNull()
  })
})

describe('sound slots', () => {
  beforeEach(() => resetSoundPolicyForTests())
  it('enforces per-cue cooldowns', () => {
    expect(claimSoundSlot('notification', 10_000)).toBe(true)
    expect(claimSoundSlot('notification', 10_000 + SOUND_CATALOG.notification.cooldownMs - 1)).toBe(false)
    expect(claimSoundSlot('notification', 10_000 + SOUND_CATALOG.notification.cooldownMs)).toBe(true)
  })
  it('mutes everything during the backlog window', () => {
    suppressSoundsFor(1500, 5_000)
    expect(claimSoundSlot('message', 6_000)).toBe(false)
    expect(claimSoundSlot('message', 6_600)).toBe(true)
  })
})

describe('othersReactionCount', () => {
  it('ignores your own reaction', () => {
    expect(othersReactionCount([{ count: 2, reactedByMe: true }, { count: 1, reactedByMe: false }])).toBe(2)
  })
})
