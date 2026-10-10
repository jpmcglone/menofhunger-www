import type { Notification, NotificationFeedItem, NotificationGroup } from '~/types/api'
import type { NotificationsState } from './useNotificationsState'

/** Click-through destinations for notification rows, groups and feed items. */
export function useNotificationLinks(c: Pick<NotificationsState, 'me'>) {
  const { me } = c

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


  return { rowHref, groupHref, itemHref }
}
