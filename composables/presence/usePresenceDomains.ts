import type { Ref } from 'vue'
import type { Socket } from 'socket.io-client'
import type {
  RadioChatMessage,
  RadioListener,
  SpaceChatSender,
  SpaceChatMessage,
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
  WsGroupMarvChangedPayload,
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
  MarvCreditsUpdatedPayloadDto,
} from '~/types/api'
import type {
  AdminCallback,
  ArticlesCallback,
  CheckinsCallback,
  CrewCallback,
  FollowsCallback,
  GroupFeedCallback,
  GroupInviteCallback,
  MarvCallback,
  MessagesCallback,
  NotificationsCallback,
  PostsCallback,
  RadioCallback,
  ReferralCallback,
  ScheduledCallback,
  SpacesCallback,
  UsersCallback,
  WsCrewDisbandedPayload,
  WsCrewInviteUpdatedPayload,
  WsCrewMembersChangedPayload,
  WsCrewOwnerChangedPayload,
  WsCrewStreakAdvancedPayload,
  WsCrewStreakBrokenPayload,
  WsCrewTransferVotePayload,
  WsCrewUpdatedPayload,
  WsCrewWallPayload,
  WsGroupInviteUpdatedPayload,
  WsReferralRecruitUpdatedPayload,
} from './types'
import { useUsersStore } from '~/composables/useUsersStore'

const PRESENCE_USER_CURRENT_SPACE_KEY = 'presence-user-current-space-by-id'

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v && typeof v === 'object')
}

function pickPublicUserEntity(u: unknown): import('~/composables/useUsersStore').PublicUserEntity | null {
  if (!isRecord(u)) return null
  const id = typeof u.id === 'string' ? u.id : null
  if (!id) return null
  return {
    id,
    username: typeof u.username === 'string' ? u.username : null,
    name: typeof u.name === 'string' ? u.name : null,
    bio: typeof u.bio === 'string' ? u.bio : null,
    premium: typeof u.premium === 'boolean' ? u.premium : undefined,
    premiumPlus: typeof u.premiumPlus === 'boolean' ? u.premiumPlus : undefined,
    verifiedStatus: typeof u.verifiedStatus === 'string' ? u.verifiedStatus : undefined,
    avatarUrl: typeof u.avatarUrl === 'string' ? u.avatarUrl : null,
    bannerUrl: typeof u.bannerUrl === 'string' ? u.bannerUrl : null,
    pinnedPostId: typeof u.pinnedPostId === 'string' ? u.pinnedPostId : null,
    lastOnlineAt: typeof u.lastOnlineAt === 'string' ? u.lastOnlineAt : null,
  }
}

/**
 * Per-domain callback registries (messages, radio, spaces, notifications,
 * follows, posts, articles, admin, users, crew, group invites, group feeds,
 * check-ins, Marv) and the socket handlers that fan events out to them.
 */
export function usePresenceDomains() {
  const usersStore = useUsersStore()
  const userCurrentSpaceById = useState<Record<string, string | null>>(PRESENCE_USER_CURRENT_SPACE_KEY, () => ({}))

  const messagesCallbacks = useState<Set<MessagesCallback>>('presence-messages-callbacks', () => new Set())
  const radioCallbacks = useState<Set<RadioCallback>>('presence-radio-callbacks', () => new Set())
  const spacesCallbacks = useState<Set<SpacesCallback>>('presence-spaces-callbacks', () => new Set())
  const notificationsCallbacks = useState<Set<NotificationsCallback>>('presence-notifications-callbacks', () => new Set())
  const followsCallbacks = useState<Set<FollowsCallback>>('presence-follows-callbacks', () => new Set())
  const postsCallbacks = useState<Set<PostsCallback>>('presence-posts-callbacks', () => new Set())
  const articlesCallbacks = useState<Set<ArticlesCallback>>('presence-articles-callbacks', () => new Set())
  const adminCallbacks = useState<Set<AdminCallback>>('presence-admin-callbacks', () => new Set())
  const usersCallbacks = useState<Set<UsersCallback>>('presence-users-callbacks', () => new Set())
  const crewCallbacks = useState<Set<CrewCallback>>('presence-crew-callbacks', () => new Set())
  const groupInviteCallbacks = useState<Set<GroupInviteCallback>>('presence-group-invite-callbacks', () => new Set())
  const groupFeedCallbacks = useState<Set<GroupFeedCallback>>('presence-group-feed-callbacks', () => new Set())
  const checkinsCallbacks = useState<Set<CheckinsCallback>>('presence-checkins-callbacks', () => new Set())
  const marvCallbacks = useState<Set<MarvCallback>>('presence-marv-callbacks', () => new Set())
  const referralCallbacks = useState<Set<ReferralCallback>>('presence-referral-callbacks', () => new Set())
  const scheduledCallbacks = useState<Set<ScheduledCallback>>('presence-scheduled-callbacks', () => new Set())

  function makeRegistry<T>(set: Ref<Set<T>>) {
    return {
      add: (cb: T) => {
        set.value.add(cb)
      },
      remove: (cb: T) => {
        set.value.delete(cb)
      },
    }
  }

  const messages = makeRegistry(messagesCallbacks)
  const radio = makeRegistry(radioCallbacks)
  const spaces = makeRegistry(spacesCallbacks)
  const notifications = makeRegistry(notificationsCallbacks)
  const follows = makeRegistry(followsCallbacks)
  const posts = makeRegistry(postsCallbacks)
  const articles = makeRegistry(articlesCallbacks)
  const admin = makeRegistry(adminCallbacks)
  const users = makeRegistry(usersCallbacks)
  const crew = makeRegistry(crewCallbacks)
  const groupInvites = makeRegistry(groupInviteCallbacks)
  const groupFeeds = makeRegistry(groupFeedCallbacks)
  const checkins = makeRegistry(checkinsCallbacks)
  const marv = makeRegistry(marvCallbacks)
  const referrals = makeRegistry(referralCallbacks)
  const scheduled = makeRegistry(scheduledCallbacks)

  function registerSocketHandlers(socket: Socket) {
    // ── Notifications / Marv ──────────────────────────────────────────
    socket.on('notifications:updated', (data: { undeliveredCount?: number }) => {
      if (!notificationsCallbacks.value.size) return
      for (const cb of notificationsCallbacks.value) {
        cb.onUpdated?.(data)
      }
    })

    socket.on('notifications:new', (data: WsNotificationsNewPayload) => {
      if (!notificationsCallbacks.value.size) return
      for (const cb of notificationsCallbacks.value) {
        cb.onNew?.(data)
      }
    })

    socket.on('notifications:deleted', (data: WsNotificationsDeletedPayload) => {
      if (!notificationsCallbacks.value.size) return
      for (const cb of notificationsCallbacks.value) {
        cb.onDeleted?.(data)
      }
    })

    socket.on('marv:credits-updated', (data: MarvCreditsUpdatedPayloadDto) => {
      if (!marvCallbacks.value.size) return
      for (const cb of marvCallbacks.value) {
        cb.onCreditsUpdated?.(data)
      }
    })

    // ── Messages ──────────────────────────────────────────────────────
    socket.on('messages:new', (data: { conversationId?: string; message?: unknown }) => {
      if (!messagesCallbacks.value.size) return
      for (const cb of messagesCallbacks.value) {
        cb.onMessage?.(data)
      }
    })

    socket.on('messages:reaction', (data: { conversationId?: string; message?: unknown }) => {
      if (!messagesCallbacks.value.size) return
      for (const cb of messagesCallbacks.value) {
        cb.onReaction?.(data)
      }
    })

    socket.on('messages:edited', (data: { conversationId?: string; message?: unknown }) => {
      if (!messagesCallbacks.value.size) return
      for (const cb of messagesCallbacks.value) {
        cb.onMessageEdited?.(data)
      }
    })

    socket.on('messages:deleted-for-all', (data: { conversationId?: string; messageId?: string }) => {
      if (!messagesCallbacks.value.size) return
      for (const cb of messagesCallbacks.value) {
        cb.onMessageDeletedForAll?.(data)
      }
    })

    socket.on('messages:typing', (data: { conversationId?: string; userId?: string; typing?: boolean; status?: string }) => {
      if (!messagesCallbacks.value.size) return
      for (const cb of messagesCallbacks.value) {
        cb.onTyping?.(data)
      }
    })

    socket.on('messages:read', (data: { conversationId?: string; userId?: string; lastReadAt?: string }) => {
      if (!messagesCallbacks.value.size) return
      for (const cb of messagesCallbacks.value) {
        cb.onRead?.(data)
      }
    })

    // ── Radio ─────────────────────────────────────────────────────────
    socket.on('radio:listeners', (data: { stationId?: string; listeners?: RadioListener[] }) => {
      if (!radioCallbacks.value.size) return
      const stationId = String(data?.stationId ?? '').trim()
      const listeners = Array.isArray(data?.listeners) ? data.listeners : []
      for (const cb of radioCallbacks.value) {
        cb.onListeners?.({ stationId, listeners })
      }
    })

    socket.on('radio:lobbyCounts', (data: { countsByStationId?: Record<string, number> }) => {
      if (!radioCallbacks.value.size) return
      const countsByStationId = (data?.countsByStationId ?? {}) as Record<string, number>
      for (const cb of radioCallbacks.value) {
        cb.onLobbyCounts?.({ countsByStationId })
      }
    })

    socket.on('radio:chatSnapshot', (data: { stationId?: string; messages?: RadioChatMessage[] }) => {
      if (!radioCallbacks.value.size) return
      const stationId = String(data?.stationId ?? '').trim()
      const messages = Array.isArray(data?.messages) ? data.messages : []
      for (const cb of radioCallbacks.value) {
        cb.onChatSnapshot?.({ stationId, messages })
      }
    })

    socket.on('radio:chatMessage', (data: { stationId?: string; message?: RadioChatMessage }) => {
      if (!radioCallbacks.value.size) return
      const stationId = String(data?.stationId ?? '').trim()
      const message = data?.message
      if (!stationId || !message?.id) return
      for (const cb of radioCallbacks.value) {
        cb.onChatMessage?.({ stationId, message })
      }
    })

    socket.on('radio:replaced', () => {
      for (const cb of radioCallbacks.value) {
        cb.onReplaced?.()
      }
    })

    // ── Spaces ────────────────────────────────────────────────────────
    socket.on('spaces:members', (data: { spaceId?: string; members?: SpaceMember[] }) => {
      if (!spacesCallbacks.value.size) return
      const spaceId = String(data?.spaceId ?? '').trim()
      const members = Array.isArray(data?.members) ? data.members : []
      for (const cb of spacesCallbacks.value) {
        cb.onMembers?.({ spaceId, members })
      }
    })

    socket.on('spaces:lobbyCounts', (data: { countsBySpaceId?: Record<string, number> }) => {
      if (!spacesCallbacks.value.size) return
      const countsBySpaceId = (data?.countsBySpaceId ?? {}) as Record<string, number>
      for (const cb of spacesCallbacks.value) {
        cb.onLobbyCounts?.({ countsBySpaceId })
      }
    })

    socket.on('spaces:chatSnapshot', (data: { spaceId?: string; messages?: SpaceChatMessage[] }) => {
      if (!spacesCallbacks.value.size) return
      const spaceId = String(data?.spaceId ?? '').trim()
      const messages = Array.isArray(data?.messages) ? data.messages : []
      for (const cb of spacesCallbacks.value) {
        cb.onChatSnapshot?.({ spaceId, messages })
      }
    })

    socket.on('spaces:chatMessage', (data: { spaceId?: string; message?: SpaceChatMessage }) => {
      if (!spacesCallbacks.value.size) return
      const spaceId = String(data?.spaceId ?? '').trim()
      const message = data?.message
      if (!spaceId || !message?.id) return
      for (const cb of spacesCallbacks.value) {
        cb.onChatMessage?.({ spaceId, message })
      }
    })

    socket.on('spaces:typing', (data: { spaceId?: string; sender?: SpaceChatSender; typing?: boolean }) => {
      if (!spacesCallbacks.value.size) return
      const spaceId = String(data?.spaceId ?? '').trim()
      const sender = data?.sender
      if (!spaceId || !sender?.id) return
      const typing = typeof data?.typing === 'boolean' ? data.typing : undefined
      for (const cb of spacesCallbacks.value) {
        cb.onTyping?.({ spaceId, sender, typing })
      }
    })

    socket.on('spaces:reaction', (data: SpaceReactionEvent) => {
      if (!spacesCallbacks.value.size) return
      const spaceId = String((data as any)?.spaceId ?? '').trim()
      const userId = String((data as any)?.userId ?? '').trim()
      const reactionId = String((data as any)?.reactionId ?? '').trim()
      const emoji = String((data as any)?.emoji ?? '').trim()
      if (!spaceId || !userId || !emoji) return
      for (const cb of spacesCallbacks.value) {
        cb.onReaction?.({ spaceId, userId, reactionId, emoji })
      }
    })

    socket.on('spaces:watchPartyState', (data: { spaceId?: string } & Partial<WatchPartyState>) => {
      if (!spacesCallbacks.value.size) return
      const spaceId = String(data?.spaceId ?? '').trim()
      if (!spaceId) return
      for (const cb of spacesCallbacks.value) {
        cb.onWatchPartyState?.({
          spaceId,
          videoUrl: String(data?.videoUrl ?? ''),
          isPlaying: Boolean(data?.isPlaying),
          currentTime: Number(data?.currentTime ?? 0),
          playbackRate: Number(data?.playbackRate ?? 1),
          updatedAt: Number(data?.updatedAt ?? Date.now()),
        })
      }
    })

    socket.on('spaces:modeChanged', (data: SpaceModeChanged) => {
      if (!spacesCallbacks.value.size) return
      const spaceId = String((data as any)?.spaceId ?? '').trim()
      if (!spaceId) return
      for (const cb of spacesCallbacks.value) {
        cb.onModeChanged?.(data)
      }
    })

    socket.on('spaces:watchPartyOwnerReplaced', (data: { spaceId?: string }) => {
      if (!spacesCallbacks.value.size) return
      const spaceId = String(data?.spaceId ?? '').trim()
      if (!spaceId) return
      for (const cb of spacesCallbacks.value) {
        cb.onWatchPartyOwnerReplaced?.({ spaceId })
      }
    })

    socket.on('spaces:watchPartyOwnerPromoted', (data: { spaceId?: string }) => {
      if (!spacesCallbacks.value.size) return
      const spaceId = String(data?.spaceId ?? '').trim()
      if (!spaceId) return
      for (const cb of spacesCallbacks.value) {
        cb.onWatchPartyOwnerPromoted?.({ spaceId })
      }
    })

    // ── Follows / posts / articles / groups ───────────────────────────
    socket.on('follows:changed', (data: WsFollowsChangedPayload) => {
      if (!followsCallbacks.value.size) return
      for (const cb of followsCallbacks.value) {
        cb.onChanged?.(data)
      }
    })

    socket.on('posts:interaction', (data: WsPostsInteractionPayload) => {
      if (!postsCallbacks.value.size) return
      for (const cb of postsCallbacks.value) {
        cb.onInteraction?.(data)
      }
    })

    socket.on('posts:liveUpdated', (data: WsPostsLiveUpdatedPayload) => {
      if (!postsCallbacks.value.size) return
      for (const cb of postsCallbacks.value) {
        cb.onLiveUpdated?.(data)
      }
    })

    socket.on('posts:commentAdded', (data: WsPostsCommentAddedPayload) => {
      if (!postsCallbacks.value.size) return
      for (const cb of postsCallbacks.value) {
        cb.onCommentAdded?.(data)
      }
    })

    socket.on('posts:commentDeleted', (data: WsPostsCommentDeletedPayload) => {
      if (!postsCallbacks.value.size) return
      for (const cb of postsCallbacks.value) {
        cb.onCommentDeleted?.(data)
      }
    })

    socket.on('posts:typing', (data: WsPostsTypingPayload) => {
      if (!postsCallbacks.value.size) return
      for (const cb of postsCallbacks.value) {
        cb.onTyping?.(data)
      }
    })

    socket.on('feed:newPost', (data: WsFeedNewPostPayload) => {
      if (!postsCallbacks.value.size) return
      for (const cb of postsCallbacks.value) {
        cb.onFeedNewPost?.(data)
      }
    })

    socket.on('groups:newPost', (data: WsGroupNewPostPayload) => {
      if (!groupFeedCallbacks.value.size) return
      for (const cb of groupFeedCallbacks.value) {
        cb.onNewPost?.(data)
      }
    })

    socket.on('groups:marv-changed', (data: WsGroupMarvChangedPayload) => {
      if (!groupFeedCallbacks.value.size) return
      for (const cb of groupFeedCallbacks.value) {
        cb.onMarvChanged?.(data)
      }
    })

    socket.on('articles:liveUpdated', (data: WsArticlesLiveUpdatedPayload) => {
      if (!articlesCallbacks.value.size) return
      for (const cb of articlesCallbacks.value) {
        cb.onLiveUpdated?.(data)
      }
    })

    socket.on('articles:commentAdded', (data: WsArticlesCommentAddedPayload) => {
      if (!articlesCallbacks.value.size) return
      for (const cb of articlesCallbacks.value) {
        cb.onCommentAdded?.(data)
      }
    })

    socket.on('articles:commentDeleted', (data: WsArticlesCommentDeletedPayload) => {
      if (!articlesCallbacks.value.size) return
      for (const cb of articlesCallbacks.value) {
        cb.onCommentDeleted?.(data)
      }
    })

    socket.on('articles:commentUpdated', (data: WsArticlesCommentUpdatedPayload) => {
      if (!articlesCallbacks.value.size) return
      for (const cb of articlesCallbacks.value) {
        cb.onCommentUpdated?.(data)
      }
    })

    socket.on('articles:commentReactionChanged', (data: WsArticlesCommentReactionChangedPayload) => {
      if (!articlesCallbacks.value.size) return
      for (const cb of articlesCallbacks.value) {
        cb.onCommentReactionChanged?.(data)
      }
    })

    // ── Admin / users ─────────────────────────────────────────────────
    socket.on('admin:updated', (data: WsAdminUpdatedPayload) => {
      if (!adminCallbacks.value.size) return
      for (const cb of adminCallbacks.value) {
        cb.onUpdated?.(data)
      }
    })

    socket.on('users:selfUpdated', (data: WsUsersSelfUpdatedPayload) => {
      // Normalize immediately so any UI referencing this user updates everywhere.
      const picked = pickPublicUserEntity(data?.user)
      if (picked) usersStore.upsert(picked)
      if (!usersCallbacks.value.size) return
      for (const cb of usersCallbacks.value) {
        cb.onSelfUpdated?.(data)
      }
    })

    socket.on('users:meUpdated', (data: WsUsersMeUpdatedPayload) => {
      if (!usersCallbacks.value.size) return
      for (const cb of usersCallbacks.value) {
        cb.onMeUpdated?.(data)
      }
    })

    socket.on('users:spaceChanged', (data: WsUsersSpaceChangedPayload) => {
      const uid = data?.userId
      if (!uid) return
      const next = { ...userCurrentSpaceById.value }
      next[uid] = data.spaceId ?? null
      userCurrentSpaceById.value = next
      for (const cb of usersCallbacks.value) {
        cb.onSpaceChanged?.(data)
      }
    })

    // ── Crew ──────────────────────────────────────────────────────────
    // Crew realtime: events are emitted per-user (no rooms) to every member of the
    // affected crew (and to the inviter/invitee for invite events). We just fan out
    // to whoever subscribed via addCrewCallback.
    socket.on('crew:invite-received', (data: WsCrewInviteUpdatedPayload) => {
      for (const cb of crewCallbacks.value) cb.onInviteReceived?.(data)
    })
    socket.on('crew:invite-updated', (data: WsCrewInviteUpdatedPayload) => {
      for (const cb of crewCallbacks.value) cb.onInviteUpdated?.(data)
    })
    socket.on('crew:members-changed', (data: WsCrewMembersChangedPayload) => {
      for (const cb of crewCallbacks.value) cb.onMembersChanged?.(data)
    })
    socket.on('crew:owner-changed', (data: WsCrewOwnerChangedPayload) => {
      for (const cb of crewCallbacks.value) cb.onOwnerChanged?.(data)
    })
    socket.on('crew:disbanded', (data: WsCrewDisbandedPayload) => {
      for (const cb of crewCallbacks.value) cb.onDisbanded?.(data)
    })
    socket.on('crew:updated', (data: WsCrewUpdatedPayload) => {
      for (const cb of crewCallbacks.value) cb.onUpdated?.(data)
    })
    socket.on('crew:wall:new', (data: WsCrewWallPayload) => {
      for (const cb of crewCallbacks.value) cb.onWallNew?.(data)
    })
    socket.on('crew:wall:edited', (data: WsCrewWallPayload) => {
      for (const cb of crewCallbacks.value) cb.onWallEdited?.(data)
    })
    socket.on('crew:wall:deleted', (data: WsCrewWallPayload) => {
      for (const cb of crewCallbacks.value) cb.onWallDeleted?.(data)
    })
    socket.on('crew:wall:reaction', (data: WsCrewWallPayload) => {
      for (const cb of crewCallbacks.value) cb.onWallReaction?.(data)
    })
    socket.on('crew:transfer-vote', (data: WsCrewTransferVotePayload) => {
      for (const cb of crewCallbacks.value) cb.onTransferVote?.(data)
    })
    socket.on('crew:streak:advanced', (data: WsCrewStreakAdvancedPayload) => {
      for (const cb of crewCallbacks.value) cb.onStreakAdvanced?.(data)
    })
    socket.on('crew:streak:broken', (data: WsCrewStreakBrokenPayload) => {
      for (const cb of crewCallbacks.value) cb.onStreakBroken?.(data)
    })

    // ── Group invites / check-ins ─────────────────────────────────────
    // Community group invite realtime: emitted to inviter and invitee on
    // send/cancel/accept/decline. We don't auto-refresh anything global from
    // here — pages that care register a callback to patch their own state.
    socket.on('groups:invite-received', (data: WsGroupInviteUpdatedPayload) => {
      for (const cb of groupInviteCallbacks.value) cb.onReceived?.(data)
    })
    socket.on('groups:invite-updated', (data: WsGroupInviteUpdatedPayload) => {
      for (const cb of groupInviteCallbacks.value) cb.onUpdated?.(data)
    })

    socket.on('checkin:answeredToday', (data: WsCheckinAnsweredTodayPayload) => {
      if (!checkinsCallbacks.value.size) return
      for (const cb of checkinsCallbacks.value) cb.onAnsweredToday?.(data)
    })

    // ── Referrals ─────────────────────────────────────────────────────
    socket.on('referrals:recruit-updated', (data: WsReferralRecruitUpdatedPayload) => {
      if (!referralCallbacks.value.size) return
      for (const cb of referralCallbacks.value) cb.onRecruitUpdated?.(data)
    })

    // ── Scheduled posts ───────────────────────────────────────────────
    socket.on('scheduled:published', (data: import('~/types/api').ScheduledPostPublishedPayload) => {
      if (!scheduledCallbacks.value.size) return
      for (const cb of scheduledCallbacks.value) cb.onPublished?.(data)
    })
    socket.on('scheduled:failed', (data: import('~/types/api').ScheduledPostFailedPayload) => {
      if (!scheduledCallbacks.value.size) return
      for (const cb of scheduledCallbacks.value) cb.onFailed?.(data)
    })
  }

  return {
    messages,
    radio,
    spaces,
    notifications,
    follows,
    posts,
    articles,
    admin,
    users,
    crew,
    groupInvites,
    groupFeeds,
    checkins,
    marv,
    referrals,
    scheduled,
    registerSocketHandlers,
  }
}
