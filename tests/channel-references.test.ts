import { describe, expect, it } from 'vitest'
import type { ChannelReference, GroupChannel } from '~/types/api'
import { channelReferenceFromScope, channelReferenceLabel, channelReferencePlainText, channelReferenceSuggestions, channelReferenceToken } from '~/utils/channels/references'

const channel = (id: string, groupId = 'group', name = id) => ({ id, groupId, name, displayName: null, privacy: 'normal', archivedAt: null }) as GroupChannel
const reference = (overrides: Partial<ChannelReference> = {}): ChannelReference => ({ token: '<#stable>', channelId: 'stable', name: 'bugs', displayName: 'Bug reports', privacy: 'normal', accessible: true, ...overrides })

describe('group channel references', () => {
  it('keeps stable IDs through rename while presenting the latest title', () => {
    const token = channelReferenceToken('stable')
    const resolved = channelReferenceFromScope(token, { groupId: 'group', channels: [channel('stable', 'group', 'renamed')] })
    expect(resolved.token).toBe('<#stable>')
    expect(channelReferenceLabel(resolved)).toBe('renamed')
  })

  it('fails closed for missing, revoked and foreign group targets', () => {
    const target = channel('stable', 'other')
    for (const scope of [undefined, { groupId: 'group', channels: [] }, { groupId: 'group', channels: [target] }]) {
      expect(channelReferenceFromScope('<#stable>', scope)).toEqual({ token: '<#stable>', channelId: null, name: null, displayName: null, privacy: 'private', accessible: false })
    }
    expect(channelReferenceLabel(reference({ accessible: false, name: 'secret' }))).toBe('Private')
  })

  it('never suggests channels from another group or archived channels', () => {
    const choices = [channel('general'), channel('bugs'), channel('foreign', 'other', 'bugs'), { ...channel('old', 'group', 'bugs-old'), archivedAt: '2026-01-01' }]
    expect(channelReferenceSuggestions({ groupId: 'group', channels: choices }, 'bug').map(item => item.id)).toEqual(['bugs'])
    expect(channelReferenceSuggestions(undefined, '')).toEqual([])
  })

  it('copies readable authorized text and hides unknown or restricted labels', () => {
    const body = 'See <#stable>, <#secret> and <#unknown>. 😀 #ordinary'
    const refs = [reference(), reference({ token: '<#secret>', channelId: null, name: null, displayName: null, privacy: 'private', accessible: false })]
    expect(channelReferencePlainText(body, refs)).toBe('See #Bug reports, 🔒 Private and 🔒 Private. 😀 #ordinary')
    expect(channelReferencePlainText('<#stable>', [reference({ privacy: 'private' })])).toBe('🔒 Bug reports')
    expect(channelReferencePlainText('#feed')).toBe('#feed')
  })
})
