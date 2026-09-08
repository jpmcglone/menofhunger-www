import type { FollowsCallback, PostsCallback } from '~/composables/usePresence'
import type { FollowSummaryResponse, PublicProfile } from '~/types/api'
import { mergeWelcomeProgress, parseWelcomeProgress, recordWelcomeProgress, welcomeProgressKey, WELCOME_PROGRESS_EVENT, type WelcomeProgress } from '~/utils/welcome-progress'

export function useWelcomeCard() {
  const { user } = useAuth()
  const { apiFetchData } = useApiClient()
  const presence = usePresence()
  const ready = ref(false)
  const progress = ref(parseWelcomeProgress(null))
  const dismissed = computed(() => !ready.value || progress.value.dismissed)
  const completedCount = computed(() => Number(progress.value.followed) + Number(progress.value.posted))
  const syncError = ref(false)
  let syncingUser: string | null = null

  function record(patch: Partial<WelcomeProgress>) {
    if (user.value?.id) {
      progress.value = mergeWelcomeProgress(progress.value, patch)
      recordWelcomeProgress(user.value.id, patch)
    }
  }

  function restore() {
    progress.value = parseWelcomeProgress(null)
    const id = user.value?.id
    if (!id) return
    try {
      progress.value = parseWelcomeProgress(localStorage.getItem(welcomeProgressKey(id)))
      // Migrate the old device-wide dismissal to the current account once.
      if (localStorage.getItem('moh.welcome.v1') === 'true') {
        record({ dismissed: true })
        localStorage.removeItem('moh.welcome.v1')
      }
    } catch { /* In-memory progress remains usable with storage disabled. */ }
  }

  async function sync() {
    const owner = user.value
    if (!ready.value || !owner?.username || progress.value.dismissed || syncingUser === owner.id) return
    syncingUser = owner.id
    syncError.value = false
    const [profile, follows] = await Promise.allSettled([
      apiFetchData<PublicProfile>(`/users/${encodeURIComponent(owner.username)}`),
      apiFetchData<FollowSummaryResponse>(`/follows/summary/${encodeURIComponent(owner.username)}`),
    ])
    if (syncingUser === owner.id) syncingUser = null
    if (user.value?.id !== owner.id) return
    syncError.value = profile.status === 'rejected' || follows.status === 'rejected'
    record({
      posted: profile.status === 'fulfilled' && ((profile.value.postCount ?? 0) > 0 || profile.value.longestStreakDays > 0),
      followed: follows.status === 'fulfilled' && (follows.value.followingCount ?? 0) > 0,
    })
  }

  const follows: FollowsCallback = { onChanged: payload => {
    if (payload.actorUserId === user.value?.id && payload.viewerFollowsUser) record({ followed: true })
  } }
  const posts: PostsCallback = {
    onFeedNewPost: payload => { if (payload.post.author.id === user.value?.id) record({ posted: true }) },
    onCommentAdded: payload => { if (payload.comment.author.id === user.value?.id) record({ posted: true }) },
  }
  function onProgress(event: Event) {
    const { userId, patch } = (event as CustomEvent<{ userId: string; patch: Partial<WelcomeProgress> }>).detail
    if (userId === user.value?.id) progress.value = mergeWelcomeProgress(progress.value, patch)
  }
  function onStorage(event: StorageEvent) {
    if (user.value?.id && event.key === welcomeProgressKey(user.value.id)) {
      progress.value = mergeWelcomeProgress(progress.value, parseWelcomeProgress(event.newValue))
    }
  }
  function onVisible() { if (document.visibilityState === 'visible') void sync() }
  onMounted(() => {
    restore()
    ready.value = true
    window.addEventListener(WELCOME_PROGRESS_EVENT, onProgress)
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisible)
    presence.addFollowsCallback(follows)
    presence.addPostsCallback(posts)
    void sync()
  })
  onActivated(() => { void sync() })
  watch(() => user.value?.id, () => { if (ready.value) { restore(); void sync() } })
  watch(presence.connectionBarJustConnected, connected => { if (connected) void sync() })
  onBeforeUnmount(() => {
    window.removeEventListener(WELCOME_PROGRESS_EVENT, onProgress)
    window.removeEventListener('storage', onStorage)
    document.removeEventListener('visibilitychange', onVisible)
    presence.removeFollowsCallback(follows)
    presence.removePostsCallback(posts)
  })
  return { dismissed, progress, completedCount, syncError, sync, record, dismiss: () => record({ dismissed: true }) }
}
