import type { Notification, NotificationFeedItem, NotificationGroup } from '~/types/api'
import { userColorTier, userTierBgClass, userTierTextClass } from '~/utils/user-tier'
import type { NotificationsContext } from './useNotificationsState'

/** Presentation helpers for notification rows: actor, tier classes, icons, titles, times and links. */
export function useNotificationDisplay(c: NotificationsContext) {
  const {
    me,
    usersStore,
  } = c

  function actorDisplay(n: Notification): string {
    const actor = n.actor?.id ? (usersStore.overlay(n.actor as any) as any) : n.actor
    return actor?.name?.trim() || (actor?.username ? `@${actor.username}` : 'Someone')
  }

  /** Tailwind class for actor username by tier (premium > verified > default). Use ! so it wins over layout text color. */
  function actorTierClass(n: Notification): string {
    const a = n.actor?.id ? (usersStore.overlay(n.actor as any) as any) : n.actor
    return userTierTextClass(userColorTier(a), { important: true })
  }

  /** Background color for notification type icon based on sender (actor) tier, not notification kind. */
  function actorTierIconBgClass(n: Notification): string {
    const a = n.actor?.id ? (usersStore.overlay(n.actor as any) as any) : n.actor
    return userTierBgClass(userColorTier(a), { fallback: 'bg-gray-500' })
  }

  /** Background color for mention icon based on *viewer* tier (your account). */
  function viewerTierIconBgClass(): string {
    const u = me.value
    return userTierBgClass(userColorTier(u), { fallback: 'bg-gray-500' })
  }

  /** Inline text color class for the subject post's visibility (used for the word \"post\" in comment notifications). */
  function subjectPostVisibilityTextClass(n: Notification): string {
    const v = n.subjectPostVisibility ?? null
    if (v === 'premiumOnly') return '!text-[var(--moh-premium)]'
    if (v === 'verifiedOnly') return '!text-[var(--moh-verified)]'
    if (v === 'onlyMe') return '!text-[var(--moh-onlyme)]'
    return ''
  }

  /**
   * Notification type icon background tint:
   * - Mention: color by viewer tier (your account)
   * - Generic: always normal/neutral
   * - Everything else (comment/boost/follow): color by actor tier (who did it)
   */
  function notificationTypeIconBgClass(n: Notification): string {
    if (n.kind === 'mention') return viewerTierIconBgClass()
    if (n.kind === 'generic') return 'bg-gray-500'
    if (n.kind === 'coin_transfer') return 'bg-amber-500'
    if (n.kind === 'poll_results_ready') {
      const v = n.subjectPostVisibility ?? null
      if (v === 'premiumOnly') return 'bg-[var(--moh-premium)]'
      if (v === 'verifiedOnly') return 'bg-[var(--moh-verified)]'
      if (v === 'onlyMe') return 'bg-[var(--moh-onlyme)]'
      return 'bg-gray-500'
    }
    return actorTierIconBgClass(n)
  }

  function notificationTypeIconTextClass(n: Notification): string {
    if (n.kind === 'mention') {
      const u = me.value
      return userTierTextClass(userColorTier(u), { fallback: 'text-gray-500 dark:text-gray-400' })
    }
    if (n.kind === 'coin_transfer') return 'text-amber-500'
    if (n.kind === 'generic') return 'text-gray-500 dark:text-gray-400'
    if (n.kind === 'marv_not_in_group') return 'text-violet-500'
    if (n.kind === 'poll_results_ready') {
      const v = n.subjectPostVisibility ?? null
      if (v === 'premiumOnly') return 'text-[var(--moh-premium)]'
      if (v === 'verifiedOnly') return 'text-[var(--moh-verified)]'
      if (v === 'onlyMe') return 'text-[var(--moh-onlyme)]'
      return 'text-gray-500 dark:text-gray-400'
    }
    const a = n.actor?.id ? (usersStore.overlay(n.actor as any) as any) : n.actor
    return userTierTextClass(userColorTier(a), { fallback: 'text-rose-500' })
  }

  /** Row highlight when unread. When read: no highlight. */
  function subjectTierRowClass(n: Notification): string {
    if (n.readAt) return ''
    const t = n.subjectTier ?? null
    if (t === 'premium') return 'bg-[var(--moh-premium)]/5 dark:bg-[var(--moh-premium)]/10'
    if (t === 'verified') return 'bg-[var(--moh-verified)]/5 dark:bg-[var(--moh-verified)]/10'
    return 'bg-gray-50/80 dark:bg-zinc-900/40'
  }

  function isBoostOfStatus(n: Notification): boolean {
    return n.kind === 'boost' && n.subjectPostPreview?.kind === 'status'
  }

  function statusBoostText(n: Notification): string | null {
    if (!isBoostOfStatus(n)) return null
    const fromPreview = (n.subjectPostPreview?.bodySnippet ?? '').trim()
    if (fromPreview) return fromPreview
    const fromBody = (n.body ?? '').trim()
    return fromBody || null
  }

  function boostSubjectNoun(n: Notification): string {
    if (n.subjectArticleId) return 'article'
    if (isBoostOfStatus(n)) return 'status'
    return 'post'
  }

  function titleSuffix(n: Notification): string {
    if (n.kind === 'boost' && isBoostOfStatus(n)) return 'boosted your status'
    if (n.title) return n.title
    switch (n.kind) {
      case 'comment':
        return n.subjectArticleId ? 'replied to your article' : 'replied to your post'
      case 'boost':
        return 'boosted your post'
      case 'repost':
        return 'reposted your post'
      case 'follow':
        return 'followed you'
      case 'followed_post':
        return 'posted'
      case 'checkin_post':
        return 'checked in'
      case 'followed_article':
        return 'published an article'
      case 'mention':
        return 'mentioned you'
      case 'nudge':
        return 'nudged you'
      case 'coin_transfer':
        return n.title ?? 'sent you coins'
      case 'group_join_request':
        return 'requests to join your group'
      case 'crew_invite_received':
        return n.subjectCrewName ? `invited you to ${n.subjectCrewName}` : 'invited you to their crew'
      case 'crew_invite_accepted':
        return 'accepted your crew invite'
      case 'crew_invite_declined':
        return 'declined your crew invite'
      case 'crew_invite_cancelled':
        return 'cancelled their crew invite'
      case 'crew_member_joined':
        return 'joined your crew'
      case 'crew_member_left':
        return 'left your crew'
      case 'crew_member_kicked':
        return 'was removed from your crew'
      case 'crew_owner_transferred':
        return 'Crew ownership transferred'
      case 'crew_owner_transfer_vote':
        return 'started a vote in your crew'
      case 'crew_wall_mention':
        return 'mentioned you on the wall'
      case 'crew_disbanded':
        return 'Your crew was disbanded'
      case 'community_group_invite_received':
        return n.subjectGroupName ? `invited you to ${n.subjectGroupName}` : 'invited you to their group'
      case 'community_group_invite_accepted':
        return 'accepted your group invite'
      case 'community_group_invite_declined':
        return 'declined your group invite'
      case 'community_group_invite_cancelled':
        return 'cancelled their group invite'
      case 'community_group_member_joined':
        return n.subjectGroupName ? `joined ${n.subjectGroupName}` : 'joined the group'
      case 'community_group_join_approved':
        return n.subjectGroupName ? `Your join request for ${n.subjectGroupName} was approved` : 'Your join request was approved'
      case 'community_group_join_rejected':
        return n.subjectGroupName ? `Your join request for ${n.subjectGroupName} was not accepted` : 'Your join request was not accepted'
      case 'community_group_member_removed':
        return n.subjectGroupName ? `You were removed from ${n.subjectGroupName}` : 'You were removed from a group'
      case 'community_group_disbanded':
        return n.subjectGroupName ? `${n.subjectGroupName} was disbanded` : 'A group you were in was disbanded'
      case 'word_of_the_day':
        return n.title ?? n.body ?? 'Word of the Day'
      case 'quote_of_the_day':
        return n.title ?? n.body ?? 'Quote of the Day'
      case 'account_verified':
        return n.title ?? "You're verified"
      case 'checkin_reminder':
        return n.title ?? 'Have you checked in today?'
      case 'on_this_day':
        return n.title ?? 'On this day'
      case 'premium_started':
        return n.title ?? n.body ?? "You're Premium"
      case 'premium_ended':
        return n.title ?? n.body ?? 'Your Premium ended'
      case 'space_reminder_day':
      case 'space_reminder_soon':
      case 'space_live':
      case 'space_schedule_cancelled':
      case 'space_schedule_rescheduled':
      case 'followed_space':
        return n.title ?? n.body ?? 'Space update'
      case 'marv_not_in_group':
        return n.title ?? '@marv is not in this group'
      case 'status_update':
        return 'updated their status'
      case 'message':
        return 'sent you a message'
      case 'generic':
        return 'Notification'
      default:
        return 'Notification'
    }
  }

  /** Icon name for notification kind (Iconify). */
  function notificationIconName(n: Notification): string {
    switch (n.kind) {
      case 'comment':
        return 'tabler:message-circle'
      case 'boost':
        return '' // Custom SVG
      case 'repost':
        return 'tabler:repeat'
      case 'follow':
        return 'tabler:user-plus'
      case 'followed_post':
        return 'tabler:file-text'
      case 'checkin_post':
        return 'tabler:calendar-check'
      case 'followed_article':
        return 'tabler:article'
      case 'mention':
        return 'tabler:at'
      case 'nudge':
        return 'tabler:hand-click'
      case 'poll_results_ready':
        return 'tabler:chart-bar'
      case 'coin_transfer':
        return 'tabler:coin'
      case 'message':
        return 'tabler:message'
      case 'group_join_request':
      case 'community_group_invite_received':
      case 'community_group_invite_accepted':
      case 'community_group_invite_declined':
      case 'community_group_invite_cancelled':
      case 'community_group_member_joined':
      case 'community_group_join_approved':
      case 'community_group_join_rejected':
      case 'community_group_member_removed':
      case 'community_group_disbanded':
        return 'tabler:users-group'
      case 'crew_invite_received':
      case 'crew_invite_accepted':
      case 'crew_invite_declined':
      case 'crew_invite_cancelled':
      case 'crew_member_joined':
      case 'crew_member_left':
      case 'crew_member_kicked':
      case 'crew_owner_transferred':
      case 'crew_owner_transfer_vote':
      case 'crew_wall_mention':
      case 'crew_disbanded':
        return 'tabler:shield-check'
      case 'word_of_the_day':
        return 'tabler:book'
      case 'quote_of_the_day':
        return 'tabler:quote'
      case 'checkin_reminder':
        return 'tabler:calendar-event'
      case 'on_this_day':
        return 'tabler:calendar-stats'
      case 'account_verified':
        return 'tabler:rosette-discount-check'
      case 'premium_started':
        return 'tabler:crown'
      case 'premium_ended':
        return 'tabler:crown-off'
      case 'space_reminder_day':
      case 'space_reminder_soon':
      case 'space_live':
      case 'space_schedule_cancelled':
      case 'space_schedule_rescheduled':
      case 'followed_space':
        return 'tabler:broadcast'
      case 'marv_not_in_group':
        return 'tabler:sparkles'
      case 'status_update':
        return 'tabler:message-circle'
      case 'generic':
        return 'tabler:bell'
      default:
        return 'tabler:bell'
    }
  }

  function notificationTitle(n: Notification): string {
    return `${actorDisplay(n)} ${titleSuffix(n)}`
  }

  function notificationContext(n: Notification): string {
    if (n.kind === 'generic' && n.body) return n.body
    switch (n.kind) {
      case 'comment':
        return n.subjectArticleId ? 'Article reply' : 'Reply'
      case 'boost':
        return isBoostOfStatus(n) ? 'Status' : 'Boost'
      case 'follow':
        return 'New follower'
      case 'followed_post':
        return 'New post'
      case 'checkin_post':
        return 'Check-in'
      case 'followed_article':
        return 'New article'
      case 'mention':
        return 'Mention'
      case 'nudge':
        return 'Nudge'
      case 'coin_transfer':
        return 'Coins'
      case 'group_join_request':
        return 'Join request'
      case 'community_group_invite_received':
      case 'community_group_invite_accepted':
      case 'community_group_invite_declined':
      case 'community_group_invite_cancelled':
        return 'Group invite'
      case 'community_group_member_joined':
        return 'New member'
      case 'community_group_join_approved':
        return 'Join approved'
      case 'community_group_join_rejected':
        return 'Join not accepted'
      case 'community_group_member_removed':
        return 'Removed from group'
      case 'community_group_disbanded':
        return 'Group disbanded'
      case 'marv_not_in_group':
        return 'Marv unavailable'
      case 'account_verified':
        return 'Verified'
      case 'checkin_reminder':
        return 'Check-in reminder'
      case 'on_this_day':
        return 'On this day'
      case 'status_update':
        return 'Status'
      case 'message':
        return 'Direct message'
      case 'space_reminder_day':
        return 'Space today'
      case 'space_reminder_soon':
        return 'Space soon'
      case 'space_live':
        return 'Space live'
      case 'space_schedule_cancelled':
        return 'Space cancelled'
      case 'space_schedule_rescheduled':
        return 'Space rescheduled'
      case 'followed_space':
        return 'Space scheduled'
      default:
        return ''
    }
  }


  function formatWhen(createdAt: string): string {
    const d = new Date(createdAt)
    if (Number.isNaN(d.getTime())) return ''
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffM = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffMs / 3600000)
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    if (sameDay) {
      if (diffM < 1) return 'now'
      if (diffM < 60) return `${diffM}m`
      return `${Math.max(1, diffH)}h`
    }
    const sameYear = d.getFullYear() === now.getFullYear()
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: sameYear ? undefined : 'numeric',
    })
  }

  function formatWhenFull(createdAt: string): string {
    const d = new Date(createdAt)
    if (Number.isNaN(d.getTime())) return ''
    const rawTime = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    const time = rawTime.replace(/\s/g, '').toLowerCase()
    const date = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    return `${time} - ${date}`
  }

  function rowHref(n: Notification): string | null {
    if (n.actionPath && /^\/admin\/delegation(?:\/[A-Za-z0-9_-]+)?$/.test(n.actionPath)) return n.actionPath
    if (n.kind === 'word_of_the_day') return '/daily/word'
    if (n.kind === 'quote_of_the_day') return '/daily/quote'
    if (n.kind === 'checkin_reminder') return '/home?checkin=1'
    if (n.kind === 'on_this_day' && n.subjectPostId) return `/p/${encodeURIComponent(n.subjectPostId)}`
    if (n.kind === 'account_verified') return '/verification'
    if (n.kind === 'premium_started' && me.value?.username) return `/u/${encodeURIComponent(me.value.username)}`
    if (n.kind === 'premium_ended') return '/tiers'
    if (
      n.kind === 'space_reminder_day' ||
      n.kind === 'space_reminder_soon' ||
      n.kind === 'space_live' ||
      n.kind === 'space_schedule_cancelled' ||
      n.kind === 'space_schedule_rescheduled' ||
      n.kind === 'followed_space'
    ) {
      const username = (n.subjectSpaceOwnerUsername ?? n.actor?.username ?? '').trim()
      if (username) return `/s/${encodeURIComponent(username)}`
      return '/spaces'
    }
    if (n.kind === 'coin_transfer') return '/coins'
    if (n.kind === 'message' && n.subjectConversationId) {
      return `/messages/${encodeURIComponent(n.subjectConversationId)}`
    }
    if (n.kind === 'group_join_request' && n.subjectGroupSlug) {
      return `/g/${encodeURIComponent(n.subjectGroupSlug)}?dialog=pending`
    }
    // Community group invites — invitee and inviter both land on the group
    // page; the row's inline Accept/Decline buttons take care of the action
    // itself, so the click-through is just for context.
    if (
      (n.kind === 'community_group_invite_received' ||
        n.kind === 'community_group_invite_accepted' ||
        n.kind === 'community_group_invite_declined' ||
        n.kind === 'community_group_invite_cancelled' ||
        n.kind === 'community_group_member_joined' ||
        n.kind === 'community_group_join_approved' ||
        n.kind === 'community_group_join_rejected' ||
        n.kind === 'community_group_member_removed' ||
        n.kind === 'community_group_disbanded') &&
      n.subjectGroupSlug
    ) {
      return `/g/${encodeURIComponent(n.subjectGroupSlug)}`
    }
    // All crew notifications route into the user's crew area; the page knows how to
    // surface invites (inbox), wall, members, and ownership transfer state.
    if (
      n.kind === 'crew_invite_received' ||
      n.kind === 'crew_invite_cancelled' ||
      n.kind === 'crew_invite_accepted' ||
      n.kind === 'crew_invite_declined' ||
      n.kind === 'crew_member_joined' ||
      n.kind === 'crew_member_left' ||
      n.kind === 'crew_member_kicked' ||
      n.kind === 'crew_owner_transferred' ||
      n.kind === 'crew_owner_transfer_vote' ||
      n.kind === 'crew_wall_mention' ||
      n.kind === 'crew_disbanded'
    ) {
      return '/crew'
    }
    // Board activity routes to the thread (and focuses the comment when there is one).
    if (n.boardThreadId) {
      return n.boardCommentId ? boardCommentHref(n.boardThreadId, n.boardCommentId) : boardThreadHref({ id: n.boardThreadId })
    }
    // Article-related notifications always route to the article page.
    if (n.subjectArticleId && (
      n.kind === 'followed_article' || n.kind === 'comment' || n.kind === 'mention' || n.kind === 'boost' || n.kind === 'generic'
    )) {
      const hash = n.subjectArticleCommentId ? `#comment-${n.subjectArticleCommentId}` : ''
      return `/a/${encodeURIComponent(n.subjectArticleId)}${hash}`
    }
    if (n.kind === 'status_update') {
      // If a status post was created, deep-link to it; otherwise go to the actor's profile.
      if (n.subjectPostId) return `/p/${encodeURIComponent(n.subjectPostId)}`
      if (n.actor?.username) return `/u/${encodeURIComponent(n.actor.username)}`
    }
    if (n.kind === 'marv_not_in_group' && n.actorPostId) {
      return `/p/${encodeURIComponent(n.actorPostId)}`
    }
    if ((n.kind === 'comment' || n.kind === 'followed_post' || n.kind === 'checkin_post' || n.kind === 'mention' || n.kind === 'repost') && n.actorPostId) {
      return `/p/${encodeURIComponent(n.actorPostId)}`
    }
    if (n.subjectPostId) return `/p/${encodeURIComponent(n.subjectPostId)}`
    if (n.subjectUserId && n.actor?.username) return `/u/${encodeURIComponent(n.actor.username)}`
    return null
  }

  function groupHref(g: NotificationGroup): string | null {
    if (g.kind === 'follow') {
      const meUsername = (me.value?.username ?? '').trim()
      return meUsername ? `/u/${encodeURIComponent(meUsername)}/followers` : '/settings'
    }
    if (g.kind === 'followed_post') return '/new-posts'
    if (g.boardThreadId) return boardThreadHref({ id: g.boardThreadId })
    if (g.subjectPostId) return `/p/${g.subjectPostId}`
    return null
  }

  function itemHref(item: NotificationFeedItem): string | null {
    if (item.type === 'single') return rowHref(item.notification)
    if (item.type === 'group') return groupHref(item.group)
    return '/new-posts'
  }


  return { actorDisplay, actorTierClass, actorTierIconBgClass, viewerTierIconBgClass, subjectPostVisibilityTextClass, notificationTypeIconBgClass, notificationTypeIconTextClass, subjectTierRowClass, isBoostOfStatus, statusBoostText, boostSubjectNoun, titleSuffix, notificationIconName, notificationTitle, notificationContext, formatWhen, formatWhenFull, rowHref, groupHref, itemHref }
}
