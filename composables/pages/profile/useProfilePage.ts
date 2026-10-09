import type { PublicProfile } from '~/composables/usePublicProfile'
import { userColorTier, userTierColorVar } from '~/utils/user-tier'
import { hasAnyBadge } from '~/config/milestones'
import { useProfilePageFeeds } from './useProfilePageFeeds'
import { useProfilePageActions } from './useProfilePageActions'
import type { InjectionKey } from 'vue'

/**
 * Script state for `/u/:username`, shared with the profile page sections through
 * `useProfilePageContext()`.
 */
export function useProfilePage(routeState: ReturnType<typeof useProfilePageRoute>, publicProfile: Awaited<ReturnType<typeof usePublicProfile>>) {
  const profileState = useProfilePageProfile(routeState, publicProfile)
  const feeds = useProfilePageFeeds({ ...routeState, ...profileState })
  const actions = useProfilePageActions({ ...routeState, ...profileState, ...feeds })
  const ctx = { ...routeState, ...profileState, ...feeds, ...actions }
  provide(PROFILE_PAGE_CONTEXT, ctx)
  return ctx
}

/**
 * Route and path state: the normalized username, profile sub-routes, and auth.
 * Runs before the page awaits the public profile.
 */
export function useProfilePageRoute() {
  const route = useRoute()
  const usernameParam = computed(() => String(route.params.username || ''))
  const normalizedUsername = computed(() => usernameParam.value.trim().toLowerCase())
  const baseProfilePath = computed(() => `/u/${encodeURIComponent(usernameParam.value)}`)

  // ── currentPathname: tracks the real browser URL ──────────────────────────────
  // Keep this synced from router + browser history so tab/modal state follows URL.
  const currentPathname = ref(import.meta.client ? location.pathname : route.path)

  // Sync from Vue Router (handles: arriving from a different page, initial load)
  watch(() => route.path, (path) => { currentPathname.value = path })

  // Sync from browser back/forward.
  if (import.meta.client) {
    const onPopState = () => { currentPathname.value = location.pathname }
    onMounted(() => window.addEventListener('popstate', onPopState))
    onBeforeUnmount(() => window.removeEventListener('popstate', onPopState))
  }

  // Prefer router navigation so back/forward restores exact profile subroutes.
  // For profile in-place tabs/modals, use history.pushState directly so changing
  // subpaths does not trigger global scroll reset in router scrollBehavior.
  //
  // Filters are managed via history.replaceState (historyBacked mode), so
  // location.search is the authoritative source — route.query may be stale.
  async function pushProfilePath(path: string) {
    const qs: Record<string, string> = {}
    if (import.meta.client) {
      new URLSearchParams(location.search).forEach((value, key) => { qs[key] = value })
    } else {
      Object.entries(route.query).forEach(([k, v]) => {
        if (v != null) qs[k] = Array.isArray(v) ? String(v[v.length - 1] ?? '') : String(v)
      })
    }
    currentPathname.value = path
    if (!import.meta.client) return
    const search = new URLSearchParams(qs)
    const newUrl = search.toString() ? `${path}?${search}` : path
    // Stamp correct Vue Router state so back/forward navigation restores this tab URL.
    const state = {
      ...history.state,
      back: history.state?.current ?? null,
      current: newUrl,
      forward: null,
    }
    history.pushState(state, '', newUrl)
  }

  const isFollowersRoute = computed(() => /\/followers\/?$/.test(currentPathname.value))
  const isFollowingRoute = computed(() => /\/following\/?$/.test(currentPathname.value))
  const isAffiliatesRoute = computed(() => /\/affiliates\/?$/.test(currentPathname.value))

  const { user: authUser, me: refetchMe, isPageAccount } = useAuth()

  return {
    route,
    usernameParam,
    normalizedUsername,
    baseProfilePath,
    currentPathname,
    pushProfilePath,
    isFollowersRoute,
    isFollowingRoute,
    isAffiliatesRoute,
    authUser,
    refetchMe,
    isPageAccount,
  }
}

// ─── Tab state ────────────────────────────────────────────────────────────────
export type ProfileTabKey = 'posts' | 'replies' | 'articles' | 'board' | 'media'

/**
 * The loaded profile (with own-profile overlay), header title, streaks/badges,
 * viewer permissions, feed filters, and the tab bar.
 */
export function useProfilePageProfile(ctx: ReturnType<typeof useProfilePageRoute>, publicProfile: Awaited<ReturnType<typeof usePublicProfile>>) {
  const { route, usernameParam, normalizedUsername, currentPathname, authUser, isPageAccount } = ctx

  const {
    profile: loadedProfile,
    data,
    notFound: fetchedNotFound,
    profileBanned,
    apiError,
  } = publicProfile

  const isOwnUsername = computed(() => {
    const authName = (authUser.value?.username ?? '').trim().toLowerCase()
    return Boolean(authName && authName === normalizedUsername.value)
  })

  function profileFromAuthUser(u: import('~/composables/useAuth').AuthUser): PublicProfile {
    return {
      id: u.id,
      createdAt: u.createdAt ?? '',
      username: u.username ?? null,
      name: u.name ?? null,
      bio: u.bio ?? null,
      website: u.website ?? null,
      links: u.links,
      xUsername: u.xUsername ?? null,
      pickaxUsername: u.pickaxUsername ?? null,
      rumbleUrl: u.rumbleUrl ?? null,
      linkedinUrl: u.linkedinUrl ?? null,
      youtubeUrl: u.youtubeUrl ?? null,
      locationDisplay: u.locationDisplay ?? null,
      locationZip: u.locationZip ?? null,
      locationCity: u.locationCity ?? null,
      locationCounty: u.locationCounty ?? null,
      locationState: u.locationState ?? null,
      locationCountry: u.locationCountry ?? null,
      birthdayDisplay: null,
      birthdayMonthDay: null,
      premium: Boolean(u.premium),
      premiumPlus: Boolean(u.premiumPlus),
      isOrganization: Boolean(u.isOrganization),
      verifiedStatus: u.verifiedStatus ?? 'none',
      avatarUrl: u.avatarUrl ?? null, avatarVideo: u.avatarVideo ?? null,
      bannerUrl: u.bannerUrl ?? null,
      pinnedPostId: u.pinnedPostId ?? null,
      lastOnlineAt: null,
      checkinStreakDays: u.checkinStreakDays ?? 0,
      longestStreakDays: u.longestStreakDays ?? 0,
    }
  }

  const profile = computed(() => {
    const loaded = loadedProfile.value
    if (isOwnUsername.value && authUser.value) {
      const fromAuth = profileFromAuthUser(authUser.value)
      if (!loaded) return fromAuth
      return {
        ...loaded,
        name: fromAuth.name ?? loaded.name,
        bio: fromAuth.bio ?? loaded.bio,
        website: fromAuth.website ?? loaded.website,
        links: fromAuth.links ?? loaded.links,
        xUsername: fromAuth.xUsername ?? loaded.xUsername,
        pickaxUsername: fromAuth.pickaxUsername ?? loaded.pickaxUsername,
        rumbleUrl: fromAuth.rumbleUrl === undefined ? loaded.rumbleUrl : fromAuth.rumbleUrl,
        linkedinUrl: fromAuth.linkedinUrl === undefined ? loaded.linkedinUrl : fromAuth.linkedinUrl,
        youtubeUrl: fromAuth.youtubeUrl === undefined ? loaded.youtubeUrl : fromAuth.youtubeUrl,
        locationDisplay: fromAuth.locationDisplay ?? loaded.locationDisplay,
        locationZip: fromAuth.locationZip ?? loaded.locationZip,
        locationCity: fromAuth.locationCity ?? loaded.locationCity,
        locationCounty: fromAuth.locationCounty ?? loaded.locationCounty,
        locationState: fromAuth.locationState ?? loaded.locationState,
        locationCountry: fromAuth.locationCountry ?? loaded.locationCountry,
        avatarUrl: fromAuth.avatarUrl, avatarVideo: fromAuth.avatarVideo,
        bannerUrl: fromAuth.bannerUrl ?? loaded.bannerUrl,
      }
    }
    return loaded
  })

  const notFound = computed(() => fetchedNotFound.value && !isOwnUsername.value)

  useProfileSeo({ profile, normalizedUsername, notFound, profileBanned })

  const { origin: siteOrigin } = useRequestURL()

  // Feed autodiscovery — per-author articles and posts feeds in all three formats.
  useHead(computed(() => {
    if (notFound.value || !usernameParam.value) return {}
    const displayName = profile.value?.name || usernameParam.value
    const u = encodeURIComponent(usernameParam.value)
    const base = `${siteOrigin}/u/${u}`
    return {
      link: [
        { rel: 'alternate', type: 'application/rss+xml', title: `${displayName} — Articles (RSS)`, href: `${base}/articles/feed.xml` },
        { rel: 'alternate', type: 'application/atom+xml', title: `${displayName} — Articles (Atom)`, href: `${base}/articles/feed.atom` },
        { rel: 'alternate', type: 'application/feed+json', title: `${displayName} — Articles (JSON Feed)`, href: `${base}/articles/feed.json` },
        { rel: 'alternate', type: 'application/rss+xml', title: `${displayName} — Posts (RSS)`, href: `${base}/posts/feed.xml` },
        { rel: 'alternate', type: 'application/atom+xml', title: `${displayName} — Posts (Atom)`, href: `${base}/posts/feed.atom` },
        { rel: 'alternate', type: 'application/feed+json', title: `${displayName} — Posts (JSON Feed)`, href: `${base}/posts/feed.json` },
      ],
    }
  }))

  const { header: appHeader } = useAppHeader()
  const profileName = computed(() => profile.value?.name || profile.value?.username || 'User')
  if (!notFound.value && profile.value) {
    appHeader.value = {
      title: profileName.value,
      verifiedStatus: profile.value.verifiedStatus ?? null,
      premium: profile.value.premium ?? null,
      premiumPlus: profile.value.premiumPlus ?? null,
      postCount: null,
    }
  }

  const streaksOpen = ref(false)
  const badgesOpen = ref(false)
  // Native profile handoff opens the existing badge collection directly.
  watch([() => route.query.profilePanel, () => profile.value?.longestStreakDays], ([panel, longest]) => {
    if (panel === 'badges' && hasAnyBadge(Number(longest ?? 0))) badgesOpen.value = true
  }, { immediate: true })
  const streaksWrapperEl = ref<HTMLElement | null>(null)

  const showsProfileStreaks = computed(() => {
    if (profile.value?.accountKind === 'page') return false
    if (isSelf.value && isPageAccount.value) return false
    return true
  })

  const streakCurrentDays = computed(() =>
    Math.max(0, Math.floor((isSelf.value ? authUser.value?.checkinStreakDays : profile.value?.checkinStreakDays) ?? 0))
  )
  const streakLongestDays = computed(() =>
    Math.max(0, Math.floor((isSelf.value ? authUser.value?.longestStreakDays : profile.value?.longestStreakDays) ?? 0))
  )
  const hasEarnedBadges = computed(() => hasAnyBadge(streakLongestDays.value))

  function toggleStreaks() {
    streaksOpen.value = !streaksOpen.value
  }

  // Streaks is the only popover left on this row — close it on outside taps.
  // (Badges is now a dialog and manages its own dismissal.)
  function onProfileStatPointerDown(e: PointerEvent) {
    const target = e.target
    if (!(target instanceof Node)) return
    const inStreaks = streaksWrapperEl.value?.contains(target) ?? false
    if (!inStreaks) streaksOpen.value = false
  }
  const usersStore = useUsersStore()
  const { invalidateUserPreviewCache } = useUserPreview()
  const { markReadBySubject } = useNotifications()
  watch(
    () => [profile.value?.id, authUser.value?.id] as const,
    ([profileId, uid]) => {
      if (profileId && uid) markReadBySubject({ user_id: profileId })
    },
    { immediate: true },
  )

  const isSelf = computed(() => {
    if (authUser.value?.id && profile.value?.id && authUser.value.id === profile.value.id) return true
    return isOwnUsername.value
  })
  const isViewerAdmin = computed(() => Boolean(authUser.value?.siteAdmin))
  const canEditProfile = computed(() => isSelf.value || isViewerAdmin.value)
  const isAdminOverride = computed(() => !isSelf.value && isViewerAdmin.value)
  const adminEditTargetUserId = computed(() => (!isSelf.value && isViewerAdmin.value && profile.value?.id) ? profile.value.id : undefined)

  const effectivePinnedPostId = computed(() => {
    const profilePid = profile.value?.pinnedPostId ?? null
    if (isSelf.value && authUser.value?.pinnedPostId !== undefined) {
      return authUser.value.pinnedPostId ?? null
    }
    return profilePid
  })

  const showAds = computed(() => false)

  // ─── Shared filter/sort state for all profile tabs — synced to URL params ─────
  const {
    filter: profileFilter,
    sort: profileSort,
    viewerIsVerified: profileViewerIsVerified,
    viewerIsPremium: profileViewerIsPremium,
    ctaKind: profileCtaKind,
  } = useUrlFeedFilters({ historyBacked: true })

  function tabFromRoute(path: string): ProfileTabKey {
    if (/\/replies\/?$/.test(path)) return 'replies'
    if (/\/media\/?$/.test(path)) return 'media'
    if (/\/articles\/?$/.test(path)) return 'articles'
    if (/\/board\/?$/.test(path)) return 'board'
    return 'posts'
  }

  const activeProfileTab = computed<ProfileTabKey>(() => tabFromRoute(currentPathname.value))
  const effectiveProfileCtaKind = computed<null | 'verify' | 'premium'>(() => (
    activeProfileTab.value === 'media' ? null : profileCtaKind.value
  ))

  const tabActivated = reactive<Record<ProfileTabKey, boolean>>({
    posts: true,
    replies: tabFromRoute(route.path) === 'replies',
    articles: tabFromRoute(route.path) === 'articles',
    board: tabFromRoute(route.path) === 'board',
    media: tabFromRoute(route.path) === 'media',
  })

  watch(activeProfileTab, (tab) => {
    if (!tabActivated[tab]) tabActivated[tab] = true
    nextTick(updateProfileUnderline)
  }, { immediate: true })

  const profileTabs = computed<Array<{ key: ProfileTabKey; label: string }>>(() => [
    { key: 'posts', label: 'Posts' },
    { key: 'replies', label: 'Replies' },
    { key: 'articles', label: 'Articles' },
    { key: 'board', label: 'Board' },
    { key: 'media', label: 'Media' },
  ])

  // ─── Animated tab underline ───────────────────────────────────────────────────
  const profileTabBarEl = ref<HTMLElement | null>(null)
  const profileTabButtonEls = new Map<ProfileTabKey, HTMLElement>()
  const profileUnderlineLeft = ref(0)
  const profileUnderlineWidth = ref(0)
  const profileUnderlineReady = ref(false)

  const profileActiveTabColor = computed(() => {
    const tier = userColorTier(profile.value)
    return userTierColorVar(tier) ?? 'var(--color-gray-900, #111827)'
  })

  function setProfileTabButtonRef(key: ProfileTabKey, el: HTMLElement | null) {
    if (el) profileTabButtonEls.set(key, el)
    else profileTabButtonEls.delete(key)
  }

  function updateProfileUnderline() {
    if (!import.meta.client) return
    const bar = profileTabBarEl.value
    const btn = profileTabButtonEls.get(activeProfileTab.value)
    if (!bar || !btn) return
    const barRect = bar.getBoundingClientRect()
    const btnRect = btn.getBoundingClientRect()
    profileUnderlineLeft.value = Math.round(btnRect.left - barRect.left)
    profileUnderlineWidth.value = Math.round(btnRect.width)
  }

  onMounted(() => nextTick(() => {
    updateProfileUnderline()
    requestAnimationFrame(() => { profileUnderlineReady.value = true })
  }))

  return {
    data,
    profileBanned,
    apiError,
    profile,
    notFound,
    appHeader,
    profileName,
    streaksOpen,
    badgesOpen,
    streaksWrapperEl,
    showsProfileStreaks,
    streakCurrentDays,
    streakLongestDays,
    hasEarnedBadges,
    toggleStreaks,
    onProfileStatPointerDown,
    usersStore,
    invalidateUserPreviewCache,
    isSelf,
    canEditProfile,
    isAdminOverride,
    adminEditTargetUserId,
    effectivePinnedPostId,
    showAds,
    profileFilter,
    profileSort,
    profileViewerIsVerified,
    profileViewerIsPremium,
    activeProfileTab,
    effectiveProfileCtaKind,
    tabActivated,
    profileTabs,
    profileTabBarEl,
    profileUnderlineLeft,
    profileUnderlineWidth,
    profileUnderlineReady,
    profileActiveTabColor,
    setProfileTabButtonRef,
  }
}

export type ProfilePageContext = ReturnType<typeof useProfilePage>

export const PROFILE_PAGE_CONTEXT: InjectionKey<ProfilePageContext> = Symbol('profile-page')

/** Section components of pages/u/[username]/index.vue read the shared context here. */
export function useProfilePageContext(): ProfilePageContext {
  const ctx = inject(PROFILE_PAGE_CONTEXT)
  if (!ctx) throw new Error('useProfilePageContext() must be used inside pages/u/[username]/index.vue')
  return ctx
}
