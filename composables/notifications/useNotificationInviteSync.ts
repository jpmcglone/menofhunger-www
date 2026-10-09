import type { Ref } from 'vue'
import type { NotificationFeedItem, NotificationKind } from '~/types/api'
import { usePresenceCallback } from '~/composables/presence/usePresenceCallback'

type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
type InviteIdField = 'subjectCrewInviteId' | 'subjectCommunityGroupInviteId'
type InviteStatusField = 'subjectCrewInviteStatus' | 'subjectCommunityGroupInviteStatus'

/**
 * Realtime: when a crew or community-group invite's status changes (accepted / declined /
 * cancelled / expired), possibly from another tab or device, patch matching received-invite rows in
 * place so their inline buttons swap to the terminal indicator without a refresh.
 */
export function useNotificationInviteSync(notifications: Ref<NotificationFeedItem[]>) {
  function patchInviteRows(
    payload: { invite: { id: string; status: string } },
    kind: NotificationKind,
    idField: InviteIdField,
    statusField: InviteStatusField,
  ) {
    const inviteId = payload?.invite?.id
    const status = payload?.invite?.status as InviteStatus | undefined
    if (!inviteId || !status) return
    let mutated = false
    const next = notifications.value.map((item) => {
      if (item.type !== 'single') return item
      const n = item.notification
      if (n.kind !== kind) return item
      if (n[idField] !== inviteId) return item
      mutated = true
      return {
        ...item,
        notification: { ...n, [statusField]: status },
      }
    })
    if (mutated) notifications.value = next
  }

  const crewCb = {
    onInviteUpdated(payload: { invite: { id: string; status: string } }) {
      patchInviteRows(payload, 'crew_invite_received', 'subjectCrewInviteId', 'subjectCrewInviteStatus')
    },
  }
  usePresenceCallback('Crew', crewCb)

  const groupInviteCb = {
    onUpdated(payload: { invite: { id: string; status: string } }) {
      patchInviteRows(payload, 'community_group_invite_received', 'subjectCommunityGroupInviteId', 'subjectCommunityGroupInviteStatus')
    },
  }
  usePresenceCallback('GroupInvite', groupInviteCb)

  return { crewCb, groupInviteCb }
}
