import { onActivated, onBeforeUnmount, onDeactivated, onMounted } from 'vue'
import { usePresence } from '~/composables/usePresence'
import type {
  AccountsCallback, AdminCallback, ArticlesCallback, BoardCallback, CallsCallback, ChannelCallback,
  CheckinsCallback, CrewCallback, DailyContentCallback, FollowedOnlineCallback, FollowsCallback,
  GroupFeedCallback, GroupInviteCallback, MarvCallback, MembersMapCallback, MessagesCallback,
  NotificationsCallback, OnlineFeedCallback, PostsCallback, RadioCallback, ReferralCallback,
  ScheduledCallback, SpacesCallback, UsersCallback,
} from '~/composables/presence/types'

/** Realtime callback kinds, mapped to the `add<Kind>Callback`/`remove<Kind>Callback` pair on `usePresence()`. */
export type PresenceCallbackKindMap = {
  Accounts: AccountsCallback
  Admin: AdminCallback
  Articles: ArticlesCallback
  Board: BoardCallback
  Calls: CallsCallback
  Channel: ChannelCallback
  Checkins: CheckinsCallback
  Crew: CrewCallback
  DailyContent: DailyContentCallback
  FollowedOnline: FollowedOnlineCallback
  Follows: FollowsCallback
  GroupFeed: GroupFeedCallback
  GroupInvite: GroupInviteCallback
  Marv: MarvCallback
  MembersMap: MembersMapCallback
  Messages: MessagesCallback
  Notifications: NotificationsCallback
  OnlineFeed: OnlineFeedCallback
  Posts: PostsCallback
  Radio: RadioCallback
  Referral: ReferralCallback
  Scheduled: ScheduledCallback
  Spaces: SpacesCallback
  Users: UsersCallback
}

export type PresenceCallbackKind = keyof PresenceCallbackKindMap

type PresenceRegistry = {
  [K in PresenceCallbackKind as `add${K}Callback`]: (cb: PresenceCallbackKindMap[K]) => void
} & {
  [K in PresenceCallbackKind as `remove${K}Callback`]: (cb: PresenceCallbackKindMap[K]) => void
}

export type UsePresenceCallbackOptions = {
  /**
   * Keep-alive aware: remove on deactivate and re-register on activate (pages kept alive
   * should not receive realtime patches while hidden).
   */
  activate?: boolean
  /**
   * Skip the automatic mount/unmount lifecycle. The caller drives `register()`/`unregister()`
   * (for example when registration depends on auth state). Unmount still unregisters.
   */
  manual?: boolean
}

/**
 * Register a realtime presence callback for the component lifetime.
 * Client-only (registers on mount), removed on unmount. Returns manual controls for
 * the rare conditional cases; both are idempotent.
 */
export function usePresenceCallback<K extends PresenceCallbackKind>(
  kind: K,
  callback: PresenceCallbackKindMap[K],
  options: UsePresenceCallbackOptions = {},
) {
  const presence = usePresence() as unknown as PresenceRegistry
  const add = presence[`add${kind}Callback`] as (cb: PresenceCallbackKindMap[K]) => void
  const remove = presence[`remove${kind}Callback`] as (cb: PresenceCallbackKindMap[K]) => void
  let registered = false

  function register() {
    if (registered) return
    registered = true
    add(callback)
  }
  function unregister() {
    if (!registered) return
    registered = false
    remove(callback)
  }

  if (!options.manual) onMounted(register)
  if (options.activate) {
    onActivated(register)
    onDeactivated(unregister)
  }
  onBeforeUnmount(unregister)

  return { register, unregister }
}
