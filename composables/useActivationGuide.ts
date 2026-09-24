import type { ActivationDto } from '~/types/api'
import type { FollowsCallback, PostsCallback, UsersCallback } from '~/composables/usePresence'
import { WELCOME_PROGRESS_EVENT } from '~/utils/welcome-progress'

/** Progress comes from committed API state; local storage only controls presentation. */
export function useActivationGuide() {
  const { user, isVerified } = useAuth()
  const { apiFetchData } = useApiClient()
  const { capture } = usePostHog()
  const presence = usePresence()
  const progress = ref<ActivationDto | null>(null)
  const ready = ref(false)
  const hidden = ref(false)
  const syncError = ref(false)
  const phase = computed(() => isVerified.value ? 'approved' : 'before_approval')
  const key = computed(() => `moh.activation.v1.${user.value?.id}.${phase.value}`)
  const dismissed = computed(() => !ready.value || hidden.value || !user.value || user.value.isOrganization)
  const completedCount = computed(() => !progress.value ? 0 : phase.value === 'approved'
    ? Number(progress.value.contributed) + Number(progress.value.replied) + Number(progress.value.returned)
    : Number(progress.value.verificationRequested) + Number(progress.value.followed))
  let generation = 0
  let alive = true
  let viewedKey = ''
  let syncing = false
  let queued = false

  function restore() {
    generation++
    progress.value = null
    syncError.value = false
    try { hidden.value = localStorage.getItem(key.value) === '1' } catch { hidden.value = false }
  }
  function track(event: string, action?: string) {
    capture(event, { phase: phase.value, ...(action ? { action } : {}), completed_count: completedCount.value })
  }
  function dismiss() {
    track('onboarding_guide_dismissed')
    hidden.value = true
    try { localStorage.setItem(key.value, '1') } catch { /* Keep dismissal in memory. */ }
  }
  async function sync() {
    if (!ready.value || hidden.value || !user.value) return
    if (syncing) { queued = true; return }
    syncing = true
    const version = generation
    const owner = user.value.id
    try {
      const snapshot = await apiFetchData<ActivationDto>('/users/me/activation')
      if (!alive || generation !== version || user.value?.id !== owner || snapshot.phase !== phase.value) return
      progress.value = snapshot
      syncError.value = false
      if (viewedKey !== key.value) {
        viewedKey = key.value
        track('onboarding_guide_viewed')
      }
    } catch {
      if (alive && generation === version) syncError.value = true
    } finally {
      syncing = false
      if (queued && alive) { queued = false; void sync() }
    }
  }
  const users: UsersCallback = { onMeUpdated: () => { void sync() } }
  const follows: FollowsCallback = { onChanged: p => { if (p.actorUserId === user.value?.id) void sync() } }
  const posts: PostsCallback = {
    onFeedNewPost: p => { if (p.post.author.id === user.value?.id) void sync() },
    onCommentAdded: p => { if (p.comment.author.id === user.value?.id) void sync() },
  }
  function refresh() { void sync() }
  function onVisible() { if (document.visibilityState === 'visible') refresh() }
  function onStorage(e: StorageEvent) { if (e.key === key.value) { restore(); refresh() } }
  onMounted(() => {
    restore(); ready.value = true
    window.addEventListener(WELCOME_PROGRESS_EVENT, refresh)
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisible)
    presence.addUsersCallback(users)
    presence.addFollowsCallback(follows)
    presence.addPostsCallback(posts)
    refresh()
  })
  onActivated(refresh)
  watch(key, () => { if (ready.value) { restore(); refresh() } })
  watch(presence.connectionBarJustConnected, value => { if (value) refresh() })
  onBeforeUnmount(() => {
    alive = false; generation++
    window.removeEventListener(WELCOME_PROGRESS_EVENT, refresh)
    window.removeEventListener('storage', onStorage)
    document.removeEventListener('visibilitychange', onVisible)
    presence.removeUsersCallback(users)
    presence.removeFollowsCallback(follows)
    presence.removePostsCallback(posts)
  })
  return { progress, phase, dismissed, completedCount, syncError, sync, dismiss, track }
}
