import type {
  CommunityGroupInviteStatus,
  FollowListUser,
  Recruit,
  ScheduledPostPublishedPayload,
  ScheduledPostFailedPayload,
  RadioChatMessage,
  RadioChatSnapshot,
  RadioLobbyCounts,
  RadioListener,
  SpaceChatSender,
  SpaceChatMessage,
  SpaceChatSnapshot,
  SpaceLobbyCounts,
  SpaceMember,
  SpaceModeChanged,
  SpaceReactionEvent,
  WatchPartyState,
  WsAdminUpdatedPayload,
  WsArticlesLiveUpdatedPayload,
  WsArticlesCommentAddedPayload,
  WsArticlesCommentDeletedPayload,
  WsArticlesCommentUpdatedPayload,
  WsArticlesCommentReactionChangedPayload,
  WsFollowsChangedPayload,
  WsNotificationsDeletedPayload,
  WsNotificationsNewPayload,
  WsFeedNewPostPayload,
  WsGroupNewPostPayload,
  WsPostsLiveUpdatedPayload,
  WsPostsInteractionPayload,
  WsPostsCommentAddedPayload,
  WsPostsCommentDeletedPayload,
  WsPostsTypingPayload,
  WsUsersMeUpdatedPayload,
  WsUsersSelfUpdatedPayload,
  WsUsersSpaceChangedPayload,
  WsCheckinAnsweredTodayPayload,
  UserStatus,
  MarvCreditsUpdatedPayloadDto,
} from '~/types/api'

export type PresenceOnlinePayload = { userId: string; user?: FollowListUser & { status?: UserStatus | null }; lastConnectAt?: number; idle?: boolean }
export type PresenceOfflinePayload = { userId: string }
export type PresenceOnlineFeedSnapshotPayload = { users: Array<FollowListUser & { lastConnectAt?: number; idle?: boolean; status?: UserStatus | null }>; totalOnline?: number }
export type OnlineFeedCallback = {
  onOnline?: (payload: PresenceOnlinePayload) => void
  onOffline?: (payload: PresenceOfflinePayload) => void
  onSnapshot?: (payload: PresenceOnlineFeedSnapshotPayload) => void
}

export type RadioListenersPayload = { stationId: string; listeners: RadioListener[] }
export type RadioLobbyCountsPayload = RadioLobbyCounts
export type RadioChatSnapshotPayload = RadioChatSnapshot
export type RadioChatMessagePayload = { stationId: string; message: RadioChatMessage }
export type RadioCallback = {
  onListeners?: (payload: RadioListenersPayload) => void
  onLobbyCounts?: (payload: RadioLobbyCountsPayload) => void
  onChatSnapshot?: (payload: RadioChatSnapshotPayload) => void
  onChatMessage?: (payload: RadioChatMessagePayload) => void
  /** Called when this tab's radio was closed because the user started playing in another tab. */
  onReplaced?: () => void
}

export type SpacesMembersPayload = { spaceId: string; members: SpaceMember[] }
export type SpacesLobbyCountsPayload = SpaceLobbyCounts
export type SpacesChatSnapshotPayload = SpaceChatSnapshot
export type SpacesChatMessagePayload = { spaceId: string; message: SpaceChatMessage }
export type SpacesTypingPayload = { spaceId: string; sender: SpaceChatSender; typing?: boolean }
export type SpacesReactionPayload = SpaceReactionEvent
export type SpacesWatchPartyStatePayload = { spaceId: string } & WatchPartyState
export type SpacesModeChangedPayload = SpaceModeChanged
export type SpacesCallback = {
  onMembers?: (payload: SpacesMembersPayload) => void
  onLobbyCounts?: (payload: SpacesLobbyCountsPayload) => void
  onChatSnapshot?: (payload: SpacesChatSnapshotPayload) => void
  onChatMessage?: (payload: SpacesChatMessagePayload) => void
  onTyping?: (payload: SpacesTypingPayload) => void
  onReaction?: (payload: SpacesReactionPayload) => void
  onWatchPartyState?: (payload: SpacesWatchPartyStatePayload) => void
  onModeChanged?: (payload: SpacesModeChangedPayload) => void
  /** Fired on a secondary owner tab — this tab should stop sending control events. */
  onWatchPartyOwnerReplaced?: (payload: { spaceId: string }) => void
  /** Fired when this tab is re-elected as primary owner (previous primary disconnected). */
  onWatchPartyOwnerPromoted?: (payload: { spaceId: string }) => void
}

export type MessagesCallback = {
  onMessage?: (payload: { conversationId?: string; message?: unknown }) => void
  onReaction?: (payload: { conversationId?: string; message?: unknown }) => void
  onMessageEdited?: (payload: { conversationId?: string; message?: unknown }) => void
  onMessageDeletedForAll?: (payload: { conversationId?: string; messageId?: string }) => void
  onTyping?: (payload: { conversationId?: string; userId?: string; typing?: boolean; status?: string }) => void
  onRead?: (payload: { conversationId?: string; userId?: string; lastReadAt?: string }) => void
}

export type WsNotificationsUpdatedPayload = { undeliveredCount?: number }

export type NotificationsCallback = {
  /**
   * Fired when badge/undelivered count changes (e.g. new notification, mark delivered/read/ignored).
   * Useful to refresh the notifications feed while user is on-screen.
   */
  onUpdated?: (payload: WsNotificationsUpdatedPayload) => void
  onNew?: (payload: WsNotificationsNewPayload) => void
  onDeleted?: (payload: WsNotificationsDeletedPayload) => void
}

/**
 * Marv (AI helper) realtime callbacks. Currently we only fire `onCreditsUpdated`, emitted
 * after every Marv reply (or admin credit adjustment) so the credits chip in the chat page
 * / settings can patch state in place without polling.
 */
export type MarvCallback = {
  onCreditsUpdated?: (payload: MarvCreditsUpdatedPayloadDto) => void
}

export type FollowsCallback = {
  onChanged?: (payload: WsFollowsChangedPayload) => void
}

export type PostsCallback = {
  onInteraction?: (payload: WsPostsInteractionPayload) => void
  onLiveUpdated?: (payload: WsPostsLiveUpdatedPayload) => void
  onCommentAdded?: (payload: WsPostsCommentAddedPayload) => void
  onCommentDeleted?: (payload: WsPostsCommentDeletedPayload) => void
  /** New top-level post from a followed user; home feed uses this to prepend in real time. */
  onFeedNewPost?: (payload: WsFeedNewPostPayload) => void
  /** Someone is composing a reply to a post the viewer is subscribed to. */
  onTyping?: (payload: WsPostsTypingPayload) => void
}

export type ArticlesCallback = {
  onLiveUpdated?: (payload: WsArticlesLiveUpdatedPayload) => void
  onCommentAdded?: (payload: WsArticlesCommentAddedPayload) => void
  onCommentDeleted?: (payload: WsArticlesCommentDeletedPayload) => void
  onCommentUpdated?: (payload: WsArticlesCommentUpdatedPayload) => void
  onCommentReactionChanged?: (payload: WsArticlesCommentReactionChangedPayload) => void
}

export type AdminCallback = {
  onUpdated?: (payload: WsAdminUpdatedPayload) => void
}

export type UsersCallback = {
  onSelfUpdated?: (payload: WsUsersSelfUpdatedPayload) => void
  onMeUpdated?: (payload: WsUsersMeUpdatedPayload) => void
  onSpaceChanged?: (payload: WsUsersSpaceChangedPayload) => void
}

/**
 * Crew realtime payloads. The server fans these out to each member of the
 * affected crew (and to the inviter/invitee for invite events). Pages that
 * care can register a callback to react in place — the global hook also keeps
 * the viewer's nav membership cache in sync regardless.
 */
export type WsCrewInviteUpdatedPayload = {
  invite: {
    id: string
    status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired'
    [key: string]: unknown
  }
}
export type WsCrewMembersChangedPayload = {
  crewId: string
  kind: 'joined' | 'left' | 'kicked'
  userId: string
}
export type WsCrewOwnerChangedPayload = {
  crewId: string
  newOwnerUserId: string
  previousOwnerUserId: string
  reason: 'direct' | 'vote' | 'inactivity'
}
export type WsCrewDisbandedPayload = { crewId: string }
export type WsCrewUpdatedPayload = { crew: unknown }
export type WsCrewWallPayload = { crewId: string; conversationId: string; message?: unknown; messageId?: string }
export type WsCrewTransferVotePayload = { crewId: string; vote: unknown }

export type WsCrewStreakAdvancedPayload = {
  crewId: string
  dayKey: string
  currentStreakDays: number
  longestStreakDays: number
}
export type WsCrewStreakBrokenPayload = {
  crewId: string
  missedDayKey: string
  missedMembers: Array<{
    id: string
    username: string | null
    displayName: string | null
  }>
}

export type CrewCallback = {
  onInviteReceived?: (payload: WsCrewInviteUpdatedPayload) => void
  onInviteUpdated?: (payload: WsCrewInviteUpdatedPayload) => void
  onMembersChanged?: (payload: WsCrewMembersChangedPayload) => void
  onOwnerChanged?: (payload: WsCrewOwnerChangedPayload) => void
  onDisbanded?: (payload: WsCrewDisbandedPayload) => void
  onUpdated?: (payload: WsCrewUpdatedPayload) => void
  onWallNew?: (payload: WsCrewWallPayload) => void
  onWallEdited?: (payload: WsCrewWallPayload) => void
  onWallDeleted?: (payload: WsCrewWallPayload) => void
  onWallReaction?: (payload: WsCrewWallPayload) => void
  onTransferVote?: (payload: WsCrewTransferVotePayload) => void
  onStreakAdvanced?: (payload: WsCrewStreakAdvancedPayload) => void
  onStreakBroken?: (payload: WsCrewStreakBrokenPayload) => void
}

/**
 * Community-group invite realtime payloads. The server fans these out to the
 * inviter and invitee on send/cancel/accept/decline. Pages can subscribe via
 * `addGroupInviteCallback` to patch in-memory state without a refetch.
 */
export type WsGroupInviteUpdatedPayload = {
  invite: {
    id: string
    status: CommunityGroupInviteStatus
    [key: string]: unknown
  }
}

export type GroupInviteCallback = {
  onReceived?: (payload: WsGroupInviteUpdatedPayload) => void
  onUpdated?: (payload: WsGroupInviteUpdatedPayload) => void
}

/**
 * Community-group feed realtime. A page subscribes to one or more group ids (room handshake);
 * the server pushes the full post DTO when a new top-level post or repost lands in that group,
 * so the feed can prepend it in place without a refetch.
 */
export type GroupFeedCallback = {
  onNewPost?: (payload: WsGroupNewPostPayload) => void
}

/**
 * Daily check-in social-proof realtime. Emitted to the actor's followers + crew members when
 * someone in the viewer's circle answers today's question. The home hero uses this to bump
 * `totalToday` and prepend a face without polling.
 */
export type CheckinsCallback = {
  onAnsweredToday?: (payload: WsCheckinAnsweredTodayPayload) => void
}

/**
 * Referral recruit updated realtime. Emitted to the recruiter when a recruit
 * reaches a new milestone (signup / verified / premium). Pages can subscribe
 * via `addReferralCallback` to patch the recruit list in place.
 */
export type WsReferralRecruitUpdatedPayload = {
  recruit: Recruit
}

export type ReferralCallback = {
  onRecruitUpdated?: (payload: WsReferralRecruitUpdatedPayload) => void
}

/**
 * Scheduled posts realtime. Emitted to the post owner when the cron publishes
 * or fails to publish a scheduled holding row.
 */
export type ScheduledCallback = {
  onPublished?: (payload: ScheduledPostPublishedPayload) => void
  onFailed?: (payload: ScheduledPostFailedPayload) => void
}
