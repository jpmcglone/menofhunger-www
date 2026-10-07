import type { Ref } from 'vue'
import type { Socket } from 'socket.io-client'
import type { AuthUser } from '~/composables/useAuth'
import type { PublicUserEntity } from '~/composables/useUsersStore'
import type {
  AccountsCallback,
  AdminCallback,
  ArticlesCallback,
  BoardCallback,
  CallsCallback,
  ChannelCallback,
  CheckinsCallback,
  CrewCallback,
  DailyContentCallback,
  FollowedOnlineCallback,
  FollowsCallback,
  GroupFeedCallback,
  GroupInviteCallback,
  MarvCallback,
  MembersMapCallback,
  MessagesCallback,
  NotificationsCallback,
  PostsCallback,
  RadioCallback,
  ReferralCallback,
  ScheduledCallback,
  SpacesCallback,
  UsersCallback,
} from './types'
import { registerPresenceMediaHandlers } from './registerPresenceMediaHandlers'
import { registerPresenceSocialHandlers } from './registerPresenceSocialHandlers'

export type PresenceSocketHandlerDeps = {
  channelCallbacks: Ref<Set<ChannelCallback>>
  notificationsCallbacks: Ref<Set<NotificationsCallback>>
  accountsCallbacks: Ref<Set<AccountsCallback>>
  marvCallbacks: Ref<Set<MarvCallback>>
  messagesCallbacks: Ref<Set<MessagesCallback>>
  radioCallbacks: Ref<Set<RadioCallback>>
  spacesCallbacks: Ref<Set<SpacesCallback>>
  followsCallbacks: Ref<Set<FollowsCallback>>
  postsCallbacks: Ref<Set<PostsCallback>>
  groupFeedCallbacks: Ref<Set<GroupFeedCallback>>
  boardCallbacks: Ref<Set<BoardCallback>>
  membersMapCallbacks: Ref<Set<MembersMapCallback>>
  followedOnlineCallbacks: Ref<Set<FollowedOnlineCallback>>
  articlesCallbacks: Ref<Set<ArticlesCallback>>
  adminCallbacks: Ref<Set<AdminCallback>>
  usersCallbacks: Ref<Set<UsersCallback>>
  userCurrentSpaceById: Ref<Record<string, string | null>>
  crewCallbacks: Ref<Set<CrewCallback>>
  groupInviteCallbacks: Ref<Set<GroupInviteCallback>>
  checkinsCallbacks: Ref<Set<CheckinsCallback>>
  referralCallbacks: Ref<Set<ReferralCallback>>
  scheduledCallbacks: Ref<Set<ScheduledCallback>>
  callsCallbacks: Ref<Set<CallsCallback>>
  dailyContentCallbacks: Ref<Set<DailyContentCallback>>
  usersStore: { upsert: (user: PublicUserEntity) => void }
  authUser: Ref<AuthUser | null>
  pickPublicUserEntity: (u: unknown) => PublicUserEntity | null
}

export function registerPresenceSocketHandlers(socket: Socket, d: PresenceSocketHandlerDeps) {
  registerPresenceMediaHandlers(socket, d)
  registerPresenceSocialHandlers(socket, d)
}
