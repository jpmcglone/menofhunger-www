import type { ProfileHeaderEmits } from './profile-header-types'
import type { PublicProfile } from '~/types/api'
import { formatDateTime, formatListTime } from '~/utils/time-format'
import { getApiErrorMessage } from '~/utils/api-error'
import { useCopyToClipboard } from '~/composables/useCopyToClipboard'
import type { useProfileHeaderProfile, MenuItemWithIcon } from './useProfileHeader'

export type AvatarMenuItem = MenuItemWithIcon

/**
 * Profile more-menu and avatar menu (block, mute, report, crew invite, RSS), presence,
 * status editing, and last-online labels.
 */
export function useProfileHeaderMenus(emit: ProfileHeaderEmits, ctx: ReturnType<typeof useProfileHeaderProfile>) {
  const { profile, profileAvatarUrl, isSelf, authUser, isAuthed, canSetStatus, viewerIsVerified } = ctx

  const canOpenMenu = computed(() => {
    if (!isAuthed.value) return false
    if (isSelf.value) return false
    return Boolean(profile.value?.id)
  })

  const reportOpen = ref(false)
  const menuRef = ref()
  const avatarWrapperRef = ref<HTMLElement | null>(null)

  // Avatar context menu (for own profile: Go to space and/or View photo).
  const { selectedSpaceId, currentSpace: currentSpaceForNav } = useSpaceLobby()
  const avatarMenuRef = ref()

  const avatarMenuItems = computed<AvatarMenuItem[]>(() => {
    const items: AvatarMenuItem[] = []
    const ownerUsername = currentSpaceForNav.value?.owner?.username
    const route = useRoute()
    if (ownerUsername && !route.path.startsWith('/spaces') && !route.path.startsWith('/s/')) {
      items.push({
        label: 'Go to space',
        iconName: 'tabler:layout-grid',
        command: () => navigateTo(`/s/${encodeURIComponent(ownerUsername)}`),
      })
    }
    if (profileAvatarUrl.value) {
      items.push({
        label: 'View photo',
        iconName: 'tabler:photo',
        command: () => {
          emit('openImage', {
            event: new MouseEvent('click'),
            url: profileAvatarUrl.value!,
            title: 'Avatar',
            kind: 'avatar',
            isOrganization: Boolean(profile.value?.isOrganization),
            originRect: avatarWrapperRef.value?.getBoundingClientRect() ?? undefined,
          })
        },
      })
    }
    return items
  })

  function onAvatarClick(event: MouseEvent) {
    const route = useRoute()
    const inSpace = Boolean(selectedSpaceId.value) && !route.path.startsWith('/spaces') && !route.path.startsWith('/s/')
    if (isSelf.value && inSpace) {
     
      ;(avatarMenuRef.value as any)?.toggle(event)
      return
    }
    if (profileAvatarUrl.value) {
      emit('openImage', {
        event,
        url: profileAvatarUrl.value,
        title: 'Avatar',
        kind: 'avatar',
        isOrganization: Boolean(profile.value?.isOrganization),
      })
    }
  }

  const blockState = useBlockState()
  const toast = useAppToast()
  const { run } = useAsyncAction()
  const { copyText } = useCopyToClipboard()
  const { origin: siteOrigin } = useRequestURL()

  async function copyProfileRssFeed() {
    const username = profile.value?.username
    if (!username) return
    const url = `${siteOrigin}/u/${encodeURIComponent(username)}/posts/feed.xml`
    await run(async () => {
      await copyText(url)
      toast.push({ title: 'RSS feed link copied', tone: 'success', durationMs: 1400 })
    }, { error: () => 'Copy failed', durationMs: 1800 })
  }

  const viewerHasBlockedProfile = computed(() =>
    Boolean(profile.value?.viewerHasBlockedUser) || blockState.isBlockedByMe(profile.value?.id ?? ''),
  )
  const profileBlockHandle = computed(() => {
    const u = profile.value?.username
    return u ? `@${u}` : 'this user'
  })

  const { muted: viewerHasMutedProfile, toggle: toggleMuteProfile } = useMuteUser({
    userId: computed(() => profile.value?.id),
    username: computed(() => profile.value?.username),
    initialMuted: computed(() => profile.value?.viewerHasMutedUser),
  })

  const blockingProfile = ref(false)
  const { confirm } = useAppConfirm()

  async function openBlockConfirm() {
    const isBlocked = viewerHasBlockedProfile.value
    const ok = await confirm({
      header: isBlocked ? `Unblock ${profileBlockHandle.value}?` : `Block ${profileBlockHandle.value}?`,
      message: isBlocked
        ? "They'll be able to see your posts and engage with them again."
        : "They can still view your posts but won't be able to engage with them.",
      confirmLabel: isBlocked ? 'Unblock' : 'Block',
      confirmSeverity: isBlocked ? 'primary' : 'danger',
    })
    if (!ok || blockingProfile.value || !profile.value?.id) return
    blockingProfile.value = true
    try {
      if (isBlocked) {
        await blockState.unblockUser(profile.value.id)
        toast.push({ title: `${profileBlockHandle.value} unblocked`, message: 'You can now engage with their posts.', tone: 'success', durationMs: 3000 })
      } else {
        await blockState.blockUser(profile.value.id)
        toast.push({ title: `${profileBlockHandle.value} blocked`, message: "They can still see your posts but can't engage with them.", tone: 'success', durationMs: 3000 })
      }
    } catch (e: unknown) {
      toast.pushError(e, isBlocked ? 'Failed to unblock.' : 'Failed to block.')
    } finally {
      blockingProfile.value = false
    }
  }

  const viewerCrew = useViewerCrew()
  // Ensure viewer crew state is loaded so the invite option appears correctly.
  // ensureLoaded is idempotent — subsequent calls are no-ops if already loaded.
  onMounted(() => { void viewerCrew.ensureLoaded() })

  const inviteToCrewOpen = ref(false)
  const inviteToCrewUserId = ref<string | null>(null)

  // Can invite to crew when:
  //   a) viewer is crew owner with room (memberCount < 5), OR
  //   b) viewer has no crew yet (will create one and invite as first member)
  // AND profile user is not already in a crew
  const canInviteToCrew = computed(() => {
    if (!isAuthed.value || isSelf.value) return false
    if (!viewerIsVerified.value) return false
    if ((profile.value as PublicProfile & { inCrew?: boolean })?.inCrew) return false
    const membership = viewerCrew.membership.value
    if (membership?.role === 'owner') {
      // Owner can invite if the viewer crew has room (max 5 members)
      // We rely on viewerCrew to know the owner's role; room check is loose here
      // (server will reject if full); this shows/hides the button optimistically.
      return true
    }
    // No crew yet — can create one and invite
    if (!membership) return true
    return false
  })

  const inviteToCrewLabel = computed(() =>
    viewerCrew.membership.value ? 'Add to my Crew' : 'Invite to Crew',
  )

  function openInviteToCrew() {
    if (!profile.value?.id) return
    inviteToCrewUserId.value = profile.value.id
    inviteToCrewOpen.value = true
  }

  const menuItems = computed<MenuItemWithIcon[]>(() => {
    if (!canOpenMenu.value) return []
    const items: MenuItemWithIcon[] = []

    if (canInviteToCrew.value) {
      items.push({
        label: inviteToCrewLabel.value,
        iconName: 'tabler:shield-check',
        class: 'text-amber-600 dark:text-amber-400 font-semibold',
        command: () => openInviteToCrew(),
      })
    }

    if (profile.value?.username) {
      items.push({
        label: 'Copy RSS feed link',
        iconName: 'tabler:rss',
        command: () => void copyProfileRssFeed(),
      })
    }

    items.push(
      {
        label: 'Report user',
        iconName: 'tabler:flag',
        command: () => {
          reportOpen.value = true
        },
      },
      {
        label: viewerHasMutedProfile.value ? `Unmute ${profileBlockHandle.value}` : `Mute ${profileBlockHandle.value}`,
        iconName: viewerHasMutedProfile.value ? 'tabler:volume' : 'tabler:volume-off',
        command: () => void toggleMuteProfile(),
      },
      {
        label: viewerHasBlockedProfile.value ? 'Unblock user' : 'Block user',
        iconName: viewerHasBlockedProfile.value ? 'tabler:ban-off' : 'tabler:ban',
        command: () => openBlockConfirm(),
      },
    )
    return items
  })

  function toggleMenu(event: Event) {
    // PrimeVue Menu expects the click event to position the popup.
   
    ;(menuRef.value as any)?.toggle(event)
  }

  function onReportSubmitted() {
    // toast + close handled in dialog
  }

  const { addInterest, removeInterest, getPresenceStatus, getUserStatus, setMyStatus, editMyStatus, clearMyStatus, isPresenceKnown } = usePresence()
  const lastProfileId = ref<string | null>(null)
  watch(
    () => profile.value?.id ?? null,
    (profileId) => {
      if (!import.meta.client) return
      const prev = lastProfileId.value
      if (prev && prev !== profileId) removeInterest([prev])
      lastProfileId.value = profileId ?? null
      if (profileId) addInterest([profileId])
    },
    { immediate: true },
  )
  onBeforeUnmount(() => {
    const id = lastProfileId.value
    if (id) removeInterest([id])
  })

  const presenceStatus = computed(() => {
    const id = profile.value?.id
    if (!id) return 'offline'
    return getPresenceStatus(id)
  })

  const showOnlineNow = computed(() => presenceStatus.value !== 'offline')

  const statusEditorOpen = ref(false)
  const statusViewOpen = ref(false)
  const statusDraft = ref('')
  const statusSaving = ref(false)
  const statusError = ref<string | null>(null)
  const activeStatus = computed(() => {
    const id = profile.value?.id
    return id ? getUserStatus(id) : null
  })

  // Pill shape adapts to wrapped text: pill (rounded-full) when the status fits
  // on a single line, rounded rectangle when it wraps to two lines. The ref is
  // shared by both the self (button) and view-only (div) branches because only
  // one is mounted at a time.
  const statusTextEl = ref<HTMLElement | null>(null)
  const { isMultiline: statusIsMultiline } = useIsMultiline(statusTextEl)

  function openStatusEditor() {
    if (!canSetStatus.value) return
    statusDraft.value = activeStatus.value?.text ?? ''
    statusError.value = null
    statusEditorOpen.value = true
  }

  function closeStatusEditor() {
    statusEditorOpen.value = false
    statusError.value = null
  }

  async function saveStatus(opts?: { durationHours?: 1 | 3 | 6 | 12 | 24; createsPost?: boolean }) {
    const text = statusDraft.value.trim()
    if (!text) return
    statusSaving.value = true
    statusError.value = null
    try {
      await setMyStatus(text, opts)
      closeStatusEditor()
    } catch (e) {
      statusError.value = getApiErrorMessage(e) || 'Could not save status.'
    } finally {
      statusSaving.value = false
    }
  }

  async function editStatus() {
    const text = statusDraft.value.trim()
    if (!text) return
    statusSaving.value = true
    statusError.value = null
    try {
      await editMyStatus(text)
      closeStatusEditor()
    } catch (e) {
      statusError.value = getApiErrorMessage(e) || 'Could not update status.'
    } finally {
      statusSaving.value = false
    }
  }

  async function clearStatus() {
    if (!activeStatus.value) return
    statusSaving.value = true
    statusError.value = null
    try {
      await clearMyStatus()
      statusDraft.value = ''
      closeStatusEditor()
    } catch (e) {
      statusError.value = getApiErrorMessage(e) || 'Could not clear status.'
    } finally {
      statusSaving.value = false
    }
  }

  const viewerCanSeeLastOnline = computed(() => {
    const status = authUser.value?.verifiedStatus ?? 'none'
    return Boolean(authUser.value?.siteAdmin) || (typeof status === 'string' && status !== 'none')
  })

  const showLastOnline = computed(() => {
    if (!viewerCanSeeLastOnline.value) return false
    if (presenceStatus.value !== 'offline') return false
    if (!profile.value?.id || !isPresenceKnown(profile.value.id)) return false
    return Boolean(profile.value?.lastOnlineAt)
  })

  const { nowMs } = useNowTicker({ everyMs: 15_000 })
  const lastOnlineShort = computed(() => {
    const iso = profile.value?.lastOnlineAt ?? null
    const t = formatListTime(iso, nowMs.value)
    if (t === 'now') return '<1m ago'
    if (/^\d+[mhd]$/.test(t)) return `${t} ago`
    return t
  })

  const lastOnlineTooltip = computed(() => {
    const iso = profile.value?.lastOnlineAt ?? null
    if (!iso) return null
    return formatDateTime(iso, { dateStyle: 'medium', timeStyle: 'short' })
  })

  return {
    canOpenMenu,
    reportOpen,
    menuRef,
    avatarWrapperRef,
    selectedSpaceId,
    avatarMenuRef,
    avatarMenuItems,
    onAvatarClick,
    inviteToCrewOpen,
    inviteToCrewUserId,
    canInviteToCrew,
    menuItems,
    toggleMenu,
    onReportSubmitted,
    showOnlineNow,
    statusEditorOpen,
    statusViewOpen,
    statusDraft,
    statusSaving,
    statusError,
    activeStatus,
    statusTextEl,
    statusIsMultiline,
    openStatusEditor,
    closeStatusEditor,
    saveStatus,
    editStatus,
    clearStatus,
    showLastOnline,
    lastOnlineShort,
    lastOnlineTooltip,
  }
}
