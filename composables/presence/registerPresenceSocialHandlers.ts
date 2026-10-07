import type {
  BoardNewThreadPayload,
  WsAdminUpdatedPayload,
  WsArticlesCommentAddedPayload,
  WsArticlesCommentDeletedPayload,
  WsArticlesCommentReactionChangedPayload,
  WsArticlesCommentUpdatedPayload,
  WsArticlesLiveUpdatedPayload,
  WsCallsIncomingPayload,
  WsCallsSeatTakenPayload,
  WsCallsUpdatedPayload,
  WsCheckinAnsweredTodayPayload,
  WsFeedNewPostPayload,
  WsFollowsChangedPayload,
  WsGroupMarvChangedPayload,
  WsGroupNewPostPayload,
  WsPostsCommentAddedPayload,
  WsPostsCommentDeletedPayload,
  WsPostsInteractionPayload,
  WsPostsLiveUpdatedPayload,
  WsPostsTypingPayload,
  WsRtcSignalPayload,
  WsUsersMeUpdatedPayload,
  WsUsersSelfUpdatedPayload,
  WsUsersSpaceChangedPayload,
} from '~/types/api'
import type { Socket } from 'socket.io-client'
import { useWotdData } from '~/composables/useWebsters1828Wotd'
import type {
  FollowedOnlineCallback,
  MembersMapCallback,
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
import type { PresenceSocketHandlerDeps } from './registerPresenceSocketHandlers'

export function registerPresenceSocialHandlers(socket: Socket, d: PresenceSocketHandlerDeps) {
  // ── Follows / posts / articles / groups ───────────────────────────
  socket.on('follows:changed', (data: WsFollowsChangedPayload) => {
    if (!d.followsCallbacks.value.size) return
    for (const cb of d.followsCallbacks.value) {
      cb.onChanged?.(data)
    }
  })

  socket.on('posts:interaction', (data: WsPostsInteractionPayload) => {
    if (!d.postsCallbacks.value.size) return
    for (const cb of d.postsCallbacks.value) {
      cb.onInteraction?.(data)
    }
  })

  socket.on('posts:liveUpdated', (data: WsPostsLiveUpdatedPayload) => {
    if (!d.postsCallbacks.value.size) return
    for (const cb of d.postsCallbacks.value) {
      cb.onLiveUpdated?.(data)
    }
  })

  socket.on('posts:commentAdded', (data: WsPostsCommentAddedPayload) => {
    if (!d.postsCallbacks.value.size) return
    for (const cb of d.postsCallbacks.value) {
      cb.onCommentAdded?.(data)
    }
  })

  socket.on('posts:commentDeleted', (data: WsPostsCommentDeletedPayload) => {
    if (!d.postsCallbacks.value.size) return
    for (const cb of d.postsCallbacks.value) {
      cb.onCommentDeleted?.(data)
    }
  })

  socket.on('posts:typing', (data: WsPostsTypingPayload) => {
    if (!d.postsCallbacks.value.size) return
    for (const cb of d.postsCallbacks.value) {
      cb.onTyping?.(data)
    }
  })

  socket.on('feed:newPost', (data: WsFeedNewPostPayload) => {
    if (!d.postsCallbacks.value.size) return
    for (const cb of d.postsCallbacks.value) {
      cb.onFeedNewPost?.(data)
    }
  })

  socket.on('groups:newPost', (data: WsGroupNewPostPayload) => {
    if (!d.groupFeedCallbacks.value.size) return
    for (const cb of d.groupFeedCallbacks.value) {
      cb.onNewPost?.(data)
    }
  })

  socket.on('groups:marv-changed', (data: WsGroupMarvChangedPayload) => {
    if (!d.groupFeedCallbacks.value.size) return
    for (const cb of d.groupFeedCallbacks.value) {
      cb.onMarvChanged?.(data)
    }
  })

  socket.on('board:new-thread', (data: BoardNewThreadPayload) => {
    for (const cb of d.boardCallbacks.value) cb.onNewThread?.(data)
  })

  socket.on('members-map:changed', (data: Parameters<NonNullable<MembersMapCallback['onChanged']>>[0]) => {
    if (!data?.kind) return
    for (const cb of d.membersMapCallbacks.value) cb.onChanged?.(data)
  })

  socket.on('presence:followed-online', (data: Parameters<NonNullable<FollowedOnlineCallback['onFollowedOnline']>>[0]) => {
    if (!Array.isArray(data?.users) || data.users.length === 0) return
    for (const cb of d.followedOnlineCallbacks.value) cb.onFollowedOnline?.(data)
  })

  socket.on('articles:liveUpdated', (data: WsArticlesLiveUpdatedPayload) => {
    if (!d.articlesCallbacks.value.size) return
    for (const cb of d.articlesCallbacks.value) {
      cb.onLiveUpdated?.(data)
    }
  })

  socket.on('articles:commentAdded', (data: WsArticlesCommentAddedPayload) => {
    if (!d.articlesCallbacks.value.size) return
    for (const cb of d.articlesCallbacks.value) {
      cb.onCommentAdded?.(data)
    }
  })

  socket.on('articles:commentDeleted', (data: WsArticlesCommentDeletedPayload) => {
    if (!d.articlesCallbacks.value.size) return
    for (const cb of d.articlesCallbacks.value) {
      cb.onCommentDeleted?.(data)
    }
  })

  socket.on('articles:commentUpdated', (data: WsArticlesCommentUpdatedPayload) => {
    if (!d.articlesCallbacks.value.size) return
    for (const cb of d.articlesCallbacks.value) {
      cb.onCommentUpdated?.(data)
    }
  })

  socket.on('articles:commentReactionChanged', (data: WsArticlesCommentReactionChangedPayload) => {
    if (!d.articlesCallbacks.value.size) return
    for (const cb of d.articlesCallbacks.value) {
      cb.onCommentReactionChanged?.(data)
    }
  })

  // ── Admin / users ─────────────────────────────────────────────────
  socket.on('admin:updated', (data: WsAdminUpdatedPayload) => {
    if (!d.adminCallbacks.value.size) return
    for (const cb of d.adminCallbacks.value) {
      cb.onUpdated?.(data)
    }
  })

  socket.on('users:selfUpdated', (data: WsUsersSelfUpdatedPayload) => {
    // Normalize immediately so any UI referencing this user updates everywhere.
    const picked = d.pickPublicUserEntity(data?.user)
    if (picked) d.usersStore.upsert(picked)
    if (!d.usersCallbacks.value.size) return
    for (const cb of d.usersCallbacks.value) {
      cb.onSelfUpdated?.(data)
    }
  })

  socket.on('users:meUpdated', (data: WsUsersMeUpdatedPayload) => {
    if (!d.usersCallbacks.value.size) return
    for (const cb of d.usersCallbacks.value) {
      cb.onMeUpdated?.(data)
    }
  })

  socket.on('users:spaceChanged', (data: WsUsersSpaceChangedPayload) => {
    const uid = data?.userId
    if (!uid) return
    const next = { ...d.userCurrentSpaceById.value }
    next[uid] = data.spaceId ?? null
    d.userCurrentSpaceById.value = next
    for (const cb of d.usersCallbacks.value) {
      cb.onSpaceChanged?.(data)
    }
  })

  // ── Crew ──────────────────────────────────────────────────────────
  // Crew realtime: events are emitted per-user (no rooms) to every member of the
  // affected crew (and to the inviter/invitee for invite events). We just fan out
  // to whoever subscribed via addCrewCallback.
  socket.on('crew:invite-received', (data: WsCrewInviteUpdatedPayload) => {
    for (const cb of d.crewCallbacks.value) cb.onInviteReceived?.(data)
  })
  socket.on('crew:invite-updated', (data: WsCrewInviteUpdatedPayload) => {
    for (const cb of d.crewCallbacks.value) cb.onInviteUpdated?.(data)
  })
  socket.on('crew:members-changed', (data: WsCrewMembersChangedPayload) => {
    for (const cb of d.crewCallbacks.value) cb.onMembersChanged?.(data)
  })
  socket.on('crew:owner-changed', (data: WsCrewOwnerChangedPayload) => {
    for (const cb of d.crewCallbacks.value) cb.onOwnerChanged?.(data)
  })
  socket.on('crew:disbanded', (data: WsCrewDisbandedPayload) => {
    for (const cb of d.crewCallbacks.value) cb.onDisbanded?.(data)
  })
  socket.on('crew:updated', (data: WsCrewUpdatedPayload) => {
    for (const cb of d.crewCallbacks.value) cb.onUpdated?.(data)
  })
  socket.on('crew:wall:new', (data: WsCrewWallPayload) => {
    for (const cb of d.crewCallbacks.value) cb.onWallNew?.(data)
  })
  socket.on('crew:wall:edited', (data: WsCrewWallPayload) => {
    for (const cb of d.crewCallbacks.value) cb.onWallEdited?.(data)
  })
  socket.on('crew:wall:deleted', (data: WsCrewWallPayload) => {
    for (const cb of d.crewCallbacks.value) cb.onWallDeleted?.(data)
  })
  socket.on('crew:wall:reaction', (data: WsCrewWallPayload) => {
    for (const cb of d.crewCallbacks.value) cb.onWallReaction?.(data)
  })
  socket.on('crew:transfer-vote', (data: WsCrewTransferVotePayload) => {
    for (const cb of d.crewCallbacks.value) cb.onTransferVote?.(data)
  })
  socket.on('crew:streak:advanced', (data: WsCrewStreakAdvancedPayload) => {
    for (const cb of d.crewCallbacks.value) cb.onStreakAdvanced?.(data)
  })
  socket.on('crew:streak:broken', (data: WsCrewStreakBrokenPayload) => {
    for (const cb of d.crewCallbacks.value) cb.onStreakBroken?.(data)
  })

  // ── Group invites / check-ins ─────────────────────────────────────
  // Community group invite realtime: emitted to inviter and invitee on
  // send/cancel/accept/decline. We don't auto-refresh anything global from
  // here — pages that care register a callback to patch their own state.
  socket.on('groups:invite-received', (data: WsGroupInviteUpdatedPayload) => {
    for (const cb of d.groupInviteCallbacks.value) cb.onReceived?.(data)
  })
  socket.on('groups:invite-updated', (data: WsGroupInviteUpdatedPayload) => {
    for (const cb of d.groupInviteCallbacks.value) cb.onUpdated?.(data)
  })

  socket.on('checkin:answeredToday', (data: WsCheckinAnsweredTodayPayload) => {
    if (!d.checkinsCallbacks.value.size) return
    for (const cb of d.checkinsCallbacks.value) cb.onAnsweredToday?.(data)
  })

  // ── Referrals ─────────────────────────────────────────────────────
  socket.on('referrals:recruit-updated', (data: WsReferralRecruitUpdatedPayload) => {
    if (!d.referralCallbacks.value.size) return
    for (const cb of d.referralCallbacks.value) cb.onRecruitUpdated?.(data)
  })

  // ── Scheduled posts ───────────────────────────────────────────────
  socket.on('scheduled:published', (data: import('~/types/api').ScheduledPostPublishedPayload) => {
    if (!d.scheduledCallbacks.value.size) return
    for (const cb of d.scheduledCallbacks.value) cb.onPublished?.(data)
  })
  socket.on('scheduled:failed', (data: import('~/types/api').ScheduledPostFailedPayload) => {
    if (!d.scheduledCallbacks.value.size) return
    for (const cb of d.scheduledCallbacks.value) cb.onFailed?.(data)
  })

  // ── DM calling ────────────────────────────────────────────────────
  socket.on('calls:incoming', (data: WsCallsIncomingPayload) => {
    if (!data?.call?.id) return
    for (const cb of d.callsCallbacks.value) cb.onIncoming?.(data)
  })
  socket.on('calls:updated', (data: WsCallsUpdatedPayload) => {
    if (!data?.call?.id) return
    for (const cb of d.callsCallbacks.value) cb.onUpdated?.(data)
  })
  socket.on('rtc:signal', (data: WsRtcSignalPayload) => {
    if (!data?.callId || !data?.fromUserId) return
    for (const cb of d.callsCallbacks.value) cb.onSignal?.(data)
  })
  socket.on('calls:seat-taken', (data: WsCallsSeatTakenPayload) => {
    if (!data?.callId || !data?.socketId) return
    for (const cb of d.callsCallbacks.value) cb.onSeatTaken?.(data)
  })

  // ── Daily content ─────────────────────────────────────────────────
  socket.on('daily:content-published', (data: { item: 'word' | 'quote'; dayKey: string }) => {
    // Invalidate even when no daily page/rail is mounted (notably on mobile).
    // Otherwise a later notification tap can resurrect yesterday's persistent word.
    if (data.item === 'word') {
      useWotdData().value = null
      clearNuxtData('websters1828:wotd')
    }
    clearNuxtData('daily-content:today')
    void refreshNuxtData(data.item === 'word'
      ? ['daily-content:today', 'websters1828:wotd']
      : ['daily-content:today'])
    if (!d.dailyContentCallbacks.value.size) return
    for (const cb of d.dailyContentCallbacks.value) cb.onPublished?.(data.item, data.dayKey)
  })

  socket.on('wotd:like-updated', (data: { likeCount: number; actorUserId: string; liked: boolean }) => {
    const isMe = d.authUser.value?.id === data.actorUserId
    const update = { likeCount: data.likeCount, ...(isMe ? { viewerHasLiked: data.liked } : {}) }

    // Patch the useAsyncData reactive ref (read by word.vue and the like-button).
    const cached = useNuxtData<import('~/types/api').Websters1828WordOfDay>('websters1828:wotd')
    if (cached.data.value) {
      cached.data.value = { ...cached.data.value, ...update }
    }

    // Also patch the useState persistent copy so the count survives page
    // navigation (useAsyncData.clear() resets its ref; useState never does).
    const persistent = useWotdData()
    if (persistent.value) {
      persistent.value = { ...persistent.value, ...update }
    }

    for (const cb of d.dailyContentCallbacks.value) cb.onLikeUpdated?.(data.likeCount, isMe ? data.liked : (cached.data.value?.viewerHasLiked ?? false))
  })
}

