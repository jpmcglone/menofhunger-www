import { useApiClient } from '~/composables/useApiClient'
import { useAuth } from '~/composables/useAuth'
import type { GetNotificationsResponse, NotificationFeedItem, NotificationKind } from '~/types/api'
import { usePresence } from '~/composables/usePresence'
import { useUsersStore } from '~/composables/useUsersStore'

export type NotificationUnreadByKind = Partial<Record<NotificationKind | 'all', number>>

/** Shared inbox session state (useState), reset whenever the signed-in account changes. */
export function useNotificationsState() {
  const { apiFetch } = useApiClient()
  const route = useRoute()
  const { user: me } = useAuth()
  const usersStore = useUsersStore()
  const {
    addNotificationsCallback,
    removeNotificationsCallback,
    setNotificationUndeliveredCount,
    groupsUnread,
    setGroupsUnread,
  } = usePresence()

  const stateKey = 'notifications:session'
  const accountId = useState<string | null>(`${stateKey}:account`, () => null)
  const generation = useState<number>(`${stateKey}:generation`, () => 0)
  const revision = useState<number>(`${stateKey}:revision`, () => 0)
  const notifications = useState<NotificationFeedItem[]>(`${stateKey}:items`, () => [])
  const nextCursor = useState<string | null>(`${stateKey}:nextCursor`, () => null)
  const loading = useState<boolean>(`${stateKey}:loading`, () => false)
  const pendingRefresh = useState<boolean>(`${stateKey}:pendingRefresh`, () => false)
  const activeKind = useState<NotificationKind | 'other' | 'board' | null>(`${stateKey}:activeKind`, () => null)
  const unreadByKind = useState<NotificationUnreadByKind>(`${stateKey}:unreadByKind`, () => ({ all: 0 }))
  // True once the first fetch has completed (success or error). Used to distinguish
  // "never fetched yet" (show loader) from "fetched and empty" (show empty state).
  const hasFetched = useState<boolean>(`${stateKey}:hasFetched`, () => false)
  /** Set when the latest inbox fetch failed; cleared on the next successful fetch. */
  const fetchError = useState<string | null>(`${stateKey}:fetchError`, () => null)
  const unreadByCategory = useState<NonNullable<GetNotificationsResponse['pagination']['unreadByCategory']>>(`${stateKey}:unreadByCategory`, () => ({}))
  const isNotificationsPage = computed(() => route.path === '/notifications')

  watch(() => me.value?.id ?? null, (id) => {
    if (accountId.value === id) return
    accountId.value = id
    generation.value += 1
    revision.value += 1
    notifications.value = []
    nextCursor.value = null
    activeKind.value = null
    unreadByKind.value = { all: 0 }
    unreadByCategory.value = {}
    loading.value = false
    pendingRefresh.value = false
    hasFetched.value = false
    fetchError.value = null
  }, { immediate: true, flush: 'sync' })
  return {
    apiFetch,
    route,
    me,
    usersStore,
    addNotificationsCallback,
    removeNotificationsCallback,
    setNotificationUndeliveredCount,
    groupsUnread,
    setGroupsUnread,
    accountId,
    generation,
    revision,
    notifications,
    nextCursor,
    loading,
    pendingRefresh,
    activeKind,
    unreadByKind,
    hasFetched,
    fetchError,
    unreadByCategory,
    isNotificationsPage,
  }
}

export type NotificationsState = ReturnType<typeof useNotificationsState>
