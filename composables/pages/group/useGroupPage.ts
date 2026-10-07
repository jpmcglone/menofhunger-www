import type { AsyncData, NuxtError } from '#app'
import type { CommunityGroupShell } from '~/types/api'
import { getApiErrorMessage } from '~/utils/api-error'
import { MOH_OPEN_COMPOSER_KEY } from '~/utils/injection-keys'
import { useGroupPageFeed } from './useGroupPageFeed'
import { useGroupPageActions } from './useGroupPageActions'

/**
 * Script state for `/g/:slug`.
 */
export function useGroupPage(routeState: ReturnType<typeof useGroupPageRoute>, shellData: Awaited<AsyncData<CommunityGroupShell | null | undefined, NuxtError | undefined>>) {
  const shellState = useGroupPageShell(routeState, shellData)
  const feed = useGroupPageFeed({ ...routeState, ...shellState })
  const actions = useGroupPageActions({ ...routeState, ...shellState, ...feed })
  return { ...routeState, ...shellState, ...feed, ...actions }
}

/**
 * Route, auth, invite attribution, and browser path tracking. Runs before the page
 * awaits the group shell.
 */
export function useGroupPageRoute() {
  const route = useRoute()
  const { apiFetchData } = useApiClient()
  const { invalidate: invalidateMyGroups } = useMyGroups()
  const { isAuthed, isVerified, user: authUser } = useAuth()
  const { markReadBySubject } = useNotifications()
  const { setPendingGroupJoin, pendingSlug: pendingGroupSlug } = usePendingGroupJoin()
  const { push: pushToast } = useAppToast()

  const slug = computed(() => String(route.params.slug ?? '').trim())
  const invitedByUsername = computed(() => {
    const raw = Array.isArray(route.query.from) ? route.query.from[0] : route.query.from
    return String(raw ?? '').trim().replace(/^@/, '') || null
  })
  const hasInviteAttribution = computed(() => {
    const ref = String(Array.isArray(route.query.ref) ? route.query.ref[0] : route.query.ref ?? '').trim()
    return Boolean(invitedByUsername.value || ref)
  })
  const verificationJoinTo = computed(() => {
    const redirect = encodeURIComponent(route.fullPath)
    return `/settings/verification?redirect=${redirect}`
  })

  function rememberJoinIntent() {
    if (slug.value) setPendingGroupJoin(slug.value)
  }

  // ── currentPathname tracks the real browser URL (for tab routing via pushState) ──
  const currentPathname = ref(import.meta.client ? location.pathname : route.path)
  watch(() => route.path, (path) => { currentPathname.value = path })
  if (import.meta.client) {
    const onPopState = () => { currentPathname.value = location.pathname }
    onMounted(() => window.addEventListener('popstate', onPopState))
    onBeforeUnmount(() => window.removeEventListener('popstate', onPopState))
  }

  return {
    route,
    apiFetchData,
    invalidateMyGroups,
    isAuthed,
    isVerified,
    authUser,
    markReadBySubject,
    setPendingGroupJoin,
    pendingGroupSlug,
    pushToast,
    slug,
    invitedByUsername,
    hasInviteAttribution,
    verificationJoinTo,
    rememberJoinIntent,
    currentPathname,
  }
}

// ─── Tab state ─────────────────────────────────────────────────────────────────
export type GroupTabKey = 'posts' | 'replies' | 'media'

/**
 * The group shell, membership and permissions, URL-backed sort, tabs, and the tab
 * underline.
 */
export function useGroupPageShell(ctx: ReturnType<typeof useGroupPageRoute>, shellData: Awaited<AsyncData<CommunityGroupShell | null | undefined, NuxtError | undefined>>) {
  const { route, isAuthed, isVerified, authUser, slug, currentPathname } = ctx

  // SSR-friendly shell fetch
  const {
    data: shell,
    error: shellFetchError,
    status: shellFetchStatus,
    refresh: refreshShell,
  } = shellData

  const layoutTabs = useGroupTabs()
  watch(shell, next => { if (next) layoutTabs.value = { group: next } }, { immediate: true })
  const shellLoading = computed(() => shellFetchStatus.value === 'pending')
  const shellError = computed(() =>
    shellFetchError.value ? getApiErrorMessage(shellFetchError.value) || 'Group not found.' : null,
  )

  async function loadShell() {
    await refreshShell()
  }

  const { header: appHeader } = useAppHeader()

  const openComposer = inject(MOH_OPEN_COMPOSER_KEY, undefined)
  function openGroupComposer() { if (isMember.value) openComposer?.({ communityGroupId: shell.value!.id }) }
  const joinBusy = ref(false)
  const leaveBusy = ref(false)
  const cancelBusy = ref(false)

  const isMember = computed(() => shell.value?.viewerMembership?.status === 'active')
  const isPendingApproval = computed(() => Boolean(shell.value?.viewerPendingApproval))
  const isOpenGroup = computed(() => shell.value?.joinPolicy === 'open')
  const canReadFeed = computed(() =>
    Boolean(shell.value?.id && (isMember.value || (isOpenGroup.value && isAuthed.value && isVerified.value))),
  )
  const groupFeedEnabled = computed(() => Boolean(shell.value?.id && canReadFeed.value))

  const isMod = computed(() => {
    const m = shell.value?.viewerMembership
    if (!m || m.status !== 'active') return false
    return m.role === 'owner' || m.role === 'moderator'
  })
  const isOwner = computed(() => shell.value?.viewerMembership?.role === 'owner')
  // Site admins can edit any group (mirrors the same affordance on profiles).
  // `isAdminOverride` only flips true when the viewer is admin AND not the owner —
  // the dialog and Edit button switch to an admin-styled affordance in that case.
  const isViewerAdmin = computed(() => Boolean(authUser.value?.siteAdmin))
  const canEditGroup = computed(() => isOwner.value || isViewerAdmin.value)
  const isAdminOverride = computed(() => isViewerAdmin.value && !isOwner.value)

  const canLeave = computed(() => {
    const m = shell.value?.viewerMembership
    if (!m || m.status !== 'active') return false
    return m.role !== 'owner'
  })

  // ─── URL-backed sort ───────────────────────────────────────────────────────────
  const { sort: groupSort } = useUrlFeedFilters({ historyBacked: true })

  function onGroupSortChange(next: 'new' | 'trending') {
    groupSort.value = next
    scrollFeedToTop()
  }

  function onGroupSortReset() {
    groupSort.value = 'new'
    scrollFeedToTop()
  }

  const baseGroupPath = computed(() => `/g/${encodeURIComponent(slug.value)}`)

  function tabFromRoute(path: string): GroupTabKey {
    if (/\/replies\/?$/.test(path)) return 'replies'
    if (/\/media\/?$/.test(path)) return 'media'
    return 'posts'
  }

  const activeGroupTab = computed<GroupTabKey>(() => tabFromRoute(currentPathname.value))

  const tabActivated = reactive<Record<GroupTabKey, boolean>>({
    posts: true,
    replies: tabFromRoute(route.path) === 'replies',
    media: tabFromRoute(route.path) === 'media',
  })

  watch(activeGroupTab, (tab) => {
    if (!tabActivated[tab]) tabActivated[tab] = true
    nextTick(updateGroupUnderline)
  }, { immediate: true })

  const groupTabs = computed<Array<{ key: GroupTabKey; label: string }>>(() => [
    { key: 'posts', label: 'Posts' },
    { key: 'replies', label: 'Replies' },
    { key: 'media', label: 'Media' },
  ])

  // ─── Animated tab underline ────────────────────────────────────────────────────
  const groupTabBarEl = ref<HTMLElement | null>(null)
  const groupFeedContentEl = ref<HTMLElement | null>(null)
  const { scrollToTop: scrollFeedToTop } = useFeedScrollToTop(groupFeedContentEl, groupTabBarEl)
  const groupTabButtonEls = new Map<GroupTabKey, HTMLElement>()
  const groupUnderlineLeft = ref(0)
  const groupUnderlineWidth = ref(0)
  const groupUnderlineReady = ref(false)

  function setGroupTabButtonRef(key: GroupTabKey, el: HTMLElement | null) {
    if (el) groupTabButtonEls.set(key, el)
    else groupTabButtonEls.delete(key)
  }

  function updateGroupUnderline() {
    if (!import.meta.client) return
    const bar = groupTabBarEl.value
    const btn = groupTabButtonEls.get(activeGroupTab.value)
    if (!bar || !btn) return
    const barRect = bar.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    groupUnderlineLeft.value = Math.round(btnRect.left - barRect.left)
    groupUnderlineWidth.value = Math.round(btnRect.width)
  }

  return {
    shell,
    shellLoading,
    shellError,
    loadShell,
    appHeader,
    openGroupComposer,
    joinBusy,
    leaveBusy,
    cancelBusy,
    isMember,
    isPendingApproval,
    isOpenGroup,
    canReadFeed,
    groupFeedEnabled,
    isMod,
    isOwner,
    canEditGroup,
    isAdminOverride,
    canLeave,
    groupSort,
    onGroupSortChange,
    baseGroupPath,
    activeGroupTab,
    tabActivated,
    groupTabs,
    groupTabBarEl,
    groupFeedContentEl,
    scrollFeedToTop,
    groupUnderlineLeft,
    groupUnderlineWidth,
    groupUnderlineReady,
    setGroupTabButtonRef,
    updateGroupUnderline,
  }
}

export type GroupPageContext = ReturnType<typeof useGroupPage>
