import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('group feed realtime dedupe', () => {
  it('skips the actor own posts in groupFeedCb (optimistic pending owns the insert)', () => {
    const source = readFile('pages/g/[slug]/index.vue')
    expect(source).toContain('onComposerPending')
    expect(source).toContain('authorId === viewerId')
    expect(source).not.toContain('createGroupPost')
  })

  it('PostComposer sends community_group_id when communityGroupId prop is set', () => {
    const source = readFile('components/app/PostComposer.vue')
    expect(source).toContain('community_group_id: props.communityGroupId')
  })

  it('marv_not_in_group uses NotificationRow, not AppPostRow', () => {
    const source = readFile('pages/notifications.vue')
    expect(source).toContain('notificationShowsPostRow')
    expect(source).not.toMatch(/v-if="item\.type === 'single' && item\.notification\.post"/)
  })
})

describe('groups:marv-changed realtime', () => {
  it('GroupFeedCallback includes onMarvChanged handler type', () => {
    const source = readFile('composables/presence/types.ts')
    expect(source).toContain('onMarvChanged')
    expect(source).toContain('WsGroupMarvChangedPayload')
  })

  it('usePresenceDomains fans groups:marv-changed out to groupFeedCallbacks', () => {
    const source = readFile('composables/presence/usePresenceDomains.ts')
    expect(source).toContain("socket.on('groups:marv-changed'")
    expect(source).toContain('cb.onMarvChanged?.(data)')
  })

  it('settings.vue registers onMarvChanged callback and subscribes to group room', () => {
    const source = readFile('pages/g/[slug]/settings.vue')
    expect(source).toContain('onMarvChanged')
    expect(source).toContain('subscribeGroups')
    expect(source).toContain('unsubscribeGroups')
    expect(source).toContain('addGroupFeedCallback')
    expect(source).toContain('removeGroupFeedCallback')
  })

  it('settings.vue onMarvChanged patches shell.marv.isMember and guards by groupId', () => {
    const source = readFile('pages/g/[slug]/settings.vue')
    // Guard: ignore events for other groups
    expect(source).toContain('s.id !== payload.groupId')
    // Patch: update isMember in place
    expect(source).toContain('isMember: payload.isMember')
  })

  it('settings.vue adds onActivated refetch for keep-alive re-activation', () => {
    const source = readFile('pages/g/[slug]/settings.vue')
    expect(source).toContain('onActivated')
    expect(source).toContain('loadShell')
  })

  it('api-contract-check includes WsGroupMarvChanged Satisfies assertion', () => {
    const source = readFile('types/api-contract-check.ts')
    expect(source).toContain('WsGroupMarvChangedPayload')
    expect(source).toContain('GroupMarvChangedPayloadDto')
  })
})
