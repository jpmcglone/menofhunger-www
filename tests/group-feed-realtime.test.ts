import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readSurfaceSource } from './helpers/surface-source'

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
    const source = [
      readFile('components/app/content/PostComposer.vue'),
      readFile('composables/composer/useComposerDestination.ts'),
      readFile('composables/composer/useComposerSubmit.ts'),
    ].join('\n')
    // effectiveGroupId falls back to props.communityGroupId when no group is selected by the picker.
    expect(source).toContain('communityGroupId')
    expect(source).toContain('effectiveGroupId')
    expect(source).toContain('community_group_id')
  })

  it('marv_not_in_group uses NotificationRow, not AppPostRow', () => {
    const source = [readFile('pages/notifications.vue'), readFile('composables/notifications/useNotificationsPage.ts')].join('\n')
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
    const source = [
      readFile('composables/presence/usePresenceDomains.ts'),
      readFile('composables/presence/registerPresenceSocketHandlers.ts'),
      readFile('composables/presence/registerPresenceMediaHandlers.ts'),
      readFile('composables/presence/registerPresenceSocialHandlers.ts'),
    ].join('\n')
    expect(source).toContain("socket.on('groups:marv-changed'")
    expect(source).toContain('cb.onMarvChanged?.(data)')
  })

  it('group dialogs registers onMarvChanged callback and subscribes to group room', () => {
    const source = readFile('components/app/groups/GroupDialogs.vue')
    expect(source).toContain('onMarvChanged')
    expect(source).toContain('subscribeGroups')
    expect(source).toContain('unsubscribeGroups')
    expect(source).toContain('addGroupFeedCallback')
    expect(source).toContain('removeGroupFeedCallback')
  })

  it('group dialogs onMarvChanged patches shell.marv.isMember and guards by groupId', () => {
    const source = readFile('components/app/groups/GroupDialogs.vue')
    // Guard: ignore events for other groups
    expect(source).toContain('payload.groupId')
    // Patch: update isMember in place
    expect(source).toContain('isMember: payload.isMember')
  })

  it('api-contract-check includes WsGroupMarvChanged Satisfies assertion', () => {
    const source = readFile('types/api-contract-check.ts')
    expect(source).toContain('WsGroupMarvChangedPayload')
    expect(source).toContain('GroupMarvChangedPayloadDto')
  })
})

describe('group join feedback', () => {
  it('group page patches membership from the join response, not only a shell refetch', () => {
    const source = readFile('pages/g/[slug]/index.vue')
    expect(source).toContain('applyCommunityGroupJoin')
    expect(source).toContain('communityGroupJoinToast')
  })

  it('explore join patches local cards and toasts success', () => {
    const source = readFile('pages/explore.vue')
    expect(source).toContain('applyCommunityGroupJoin')
    expect(source).toContain('communityGroupJoinToast')
  })

  it('gated permalink shows Join and confirms after success', () => {
    const source = readSurfaceSource('pages/p/[id].vue')
    expect(source).toContain(':show-join="isAuthed"')
    expect(source).toContain('applyCommunityGroupJoin')
    expect(source).toContain('communityGroupJoinToast')
  })

  it('approval-group invite auto-join shows a waiting-for-approval state, not the feed', () => {
    const source = readFile('pages/g/[slug]/index.vue')
    expect(source).toContain('isPendingApproval')
    expect(source).toContain('once a moderator approves')
    expect(source).toContain('approval groups stay pending')
  })
})
