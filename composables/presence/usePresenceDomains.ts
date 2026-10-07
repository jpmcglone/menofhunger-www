import type { Ref } from 'vue'
import type { Socket } from 'socket.io-client'
import type {
  AccountsCallback,
  AdminCallback,
  ArticlesCallback,
  BoardCallback,
  ChannelCallback,
  MembersMapCallback,
  FollowedOnlineCallback,
  CallsCallback,
  CheckinsCallback,
  CrewCallback,
  DailyContentCallback,
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
} from './types'
import { useUsersStore } from '~/composables/useUsersStore'
import { registerPresenceSocketHandlers } from './registerPresenceSocketHandlers'

export type { ChannelCallback } from './types'

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
    avatarVideo: u.avatarVideo === null ? null : isRecord(u.avatarVideo)
      && typeof u.avatarVideo.id === 'string' && typeof u.avatarVideo.url === 'string'
      && typeof u.avatarVideo.durationMs === 'number' && typeof u.avatarVideo.width === 'number'
      && typeof u.avatarVideo.height === 'number'
      ? { id: u.avatarVideo.id, url: u.avatarVideo.url, durationMs: u.avatarVideo.durationMs,
        width: u.avatarVideo.width, height: u.avatarVideo.height } : undefined,
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
  const { user: authUser } = useAuth()
  const userCurrentSpaceById = useState<Record<string, string | null>>(PRESENCE_USER_CURRENT_SPACE_KEY, () => ({}))

  const channelCallbacks = useState<Set<ChannelCallback>>('presence-channel-callbacks', () => new Set())
  const messagesCallbacks = useState<Set<MessagesCallback>>('presence-messages-callbacks', () => new Set())
  const radioCallbacks = useState<Set<RadioCallback>>('presence-radio-callbacks', () => new Set())
  const spacesCallbacks = useState<Set<SpacesCallback>>('presence-spaces-callbacks', () => new Set())
  const notificationsCallbacks = useState<Set<NotificationsCallback>>('presence-notifications-callbacks', () => new Set())
  const accountsCallbacks = useState<Set<AccountsCallback>>('presence-accounts-callbacks', () => new Set())
  const followsCallbacks = useState<Set<FollowsCallback>>('presence-follows-callbacks', () => new Set())
  const postsCallbacks = useState<Set<PostsCallback>>('presence-posts-callbacks', () => new Set())
  const articlesCallbacks = useState<Set<ArticlesCallback>>('presence-articles-callbacks', () => new Set())
  const boardCallbacks = useState<Set<BoardCallback>>('presence-board-callbacks', () => new Set())
  const membersMapCallbacks = useState<Set<MembersMapCallback>>('presence-members-map-callbacks', () => new Set())
  const followedOnlineCallbacks = useState<Set<FollowedOnlineCallback>>('presence-followed-online-callbacks', () => new Set())
  const adminCallbacks = useState<Set<AdminCallback>>('presence-admin-callbacks', () => new Set())
  const usersCallbacks = useState<Set<UsersCallback>>('presence-users-callbacks', () => new Set())
  const crewCallbacks = useState<Set<CrewCallback>>('presence-crew-callbacks', () => new Set())
  const groupInviteCallbacks = useState<Set<GroupInviteCallback>>('presence-group-invite-callbacks', () => new Set())
  const groupFeedCallbacks = useState<Set<GroupFeedCallback>>('presence-group-feed-callbacks', () => new Set())
  const checkinsCallbacks = useState<Set<CheckinsCallback>>('presence-checkins-callbacks', () => new Set())
  const marvCallbacks = useState<Set<MarvCallback>>('presence-marv-callbacks', () => new Set())
  const referralCallbacks = useState<Set<ReferralCallback>>('presence-referral-callbacks', () => new Set())
  const scheduledCallbacks = useState<Set<ScheduledCallback>>('presence-scheduled-callbacks', () => new Set())
  const dailyContentCallbacks = useState<Set<DailyContentCallback>>('presence-daily-content-callbacks', () => new Set())
  const callsCallbacks = useState<Set<CallsCallback>>('presence-calls-callbacks', () => new Set())

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

  const channels = makeRegistry(channelCallbacks)
  const messages = makeRegistry(messagesCallbacks)
  const radio = makeRegistry(radioCallbacks)
  const spaces = makeRegistry(spacesCallbacks)
  const notifications = makeRegistry(notificationsCallbacks)
  const accounts = makeRegistry(accountsCallbacks)
  const follows = makeRegistry(followsCallbacks)
  const posts = makeRegistry(postsCallbacks)
  const articles = makeRegistry(articlesCallbacks)
  const board = makeRegistry(boardCallbacks)
  const membersMap = makeRegistry(membersMapCallbacks)
  const followedOnline = makeRegistry(followedOnlineCallbacks)
  const admin = makeRegistry(adminCallbacks)
  const users = makeRegistry(usersCallbacks)
  const crew = makeRegistry(crewCallbacks)
  const groupInvites = makeRegistry(groupInviteCallbacks)
  const groupFeeds = makeRegistry(groupFeedCallbacks)
  const checkins = makeRegistry(checkinsCallbacks)
  const marv = makeRegistry(marvCallbacks)
  const referrals = makeRegistry(referralCallbacks)
  const scheduled = makeRegistry(scheduledCallbacks)
  const dailyContent = makeRegistry(dailyContentCallbacks)
  const calls = makeRegistry(callsCallbacks)

  function registerSocketHandlers(socket: Socket) {
    registerPresenceSocketHandlers(socket, {
      channelCallbacks, notificationsCallbacks, accountsCallbacks, marvCallbacks,
      messagesCallbacks, radioCallbacks, spacesCallbacks, followsCallbacks,
      postsCallbacks, groupFeedCallbacks, boardCallbacks, membersMapCallbacks,
      followedOnlineCallbacks, articlesCallbacks, adminCallbacks, usersCallbacks,
      userCurrentSpaceById, crewCallbacks, groupInviteCallbacks, checkinsCallbacks,
      referralCallbacks, scheduledCallbacks, callsCallbacks, dailyContentCallbacks,
      usersStore, authUser, pickPublicUserEntity,
    })
  }

  return {
    channels,
    messages,
    radio,
    spaces,
    notifications,
    accounts,
    follows,
    posts,
    articles,
    board,
    membersMap,
    followedOnline,
    admin,
    users,
    crew,
    groupInvites,
    groupFeeds,
    checkins,
    marv,
    referrals,
    scheduled,
    dailyContent,
    calls,
    registerSocketHandlers,
  }
}
