import type { ComputedRef } from 'vue'
import type { FeedPost } from '~/types/api'
import type { MenuItem } from 'primevue/menuitem'
import { tinyTooltip } from '~/utils/tiny-tooltip'
import { MOH_OPEN_COMPOSER_FROM_ONLYME_KEY } from '~/utils/injection-keys'

export type PostRowMenuItemWithIcon = MenuItem & { iconName?: string }

/**
 * The post row's "more" menu (view profile / follow / report / block /
 * pin / edit / delete / use-as-draft) and the own-post avatar context menu,
 * including the actions those menu items perform.
 */
export function usePostRowMenus(opts: {
  postView: ComputedRef<FeedPost>
  author: ComputedRef<{ id?: string | null; username?: string | null } | null>
  isSelf: ComputedRef<boolean>
  isDeletedPost: ComputedRef<boolean>
  isGatedPost: ComputedRef<boolean>
  authorBanned: ComputedRef<boolean>
  authorProfilePath: ComputedRef<string | null>
  groupWall: () => { groupId: string; viewerIsOwner: boolean } | null | undefined
  onDeleted: (id: string) => void
  onGroupPinChanged: () => void
}) {
  const { postView, author, isSelf, isDeletedPost, isGatedPost, authorBanned, authorProfilePath } = opts

  const { user, me: refetchMe, isAuthed, isVerified: viewerIsVerified } = useAuth()
  const viewerIsAdmin = computed(() => Boolean(user.value?.siteAdmin))
  const { apiFetchData } = useApiClient()
  const { show: showAuthActionModal } = useAuthActionModal()
  const blockState = useBlockState()
  const followState = useFollowState()
  const { fetchUserPreview } = useUserPreview()
  const toast = useAppToast()
  const { confirm } = useAppConfirm()
  const { nowMs } = useNowTicker({ everyMs: 15_000 })
  const route = useRoute()

  const moreTooltip = computed(() => tinyTooltip('More'))

  // ── Follow status for the post author (sourced from shared follow state) ──
  const authorFollowRel = computed(() => followState.get(author.value?.id ?? null))
  const viewerFollowsAuthor = computed(() => Boolean(authorFollowRel.value?.viewerFollowsUser))

  const followPrefetchInflight = ref(false)
  async function ensureAuthorFollowLoaded() {
    const id = author.value?.id
    const username = author.value?.username
    if (!id || !username || isSelf.value) return
    if (followState.get(id) !== null || followPrefetchInflight.value) return
    followPrefetchInflight.value = true
    try {
      const preview = await fetchUserPreview(username)
      followState.set(id, preview.relationship)
    } catch {
      // leave label defaulted to Follow
    } finally {
      followPrefetchInflight.value = false
    }
  }

  const viewerBlockStatus = computed(() => postView.value.viewerBlockStatus ?? null)

  // ── Avatar context menu: own post while in a space (but not on /spaces) ───
  const { selectedSpaceId, currentSpace: currentSpaceForNav } = useSpaceLobby()
  const showAvatarMenu = computed(() => {
    if (!isSelf.value) return false
    if (!selectedSpaceId.value) return false
    if (route.path.startsWith('/spaces') || route.path.startsWith('/s/')) return false
    return true
  })
  const avatarMenuRef = ref()
  const avatarMenuItems = computed<PostRowMenuItemWithIcon[]>(() => {
    const items: PostRowMenuItemWithIcon[] = []
    const ownerUsername = currentSpaceForNav.value?.owner?.username
    if (ownerUsername) {
      items.push({
        label: 'Go to space',
        iconName: 'tabler:layout-grid',
        command: () => navigateTo(`/s/${encodeURIComponent(ownerUsername)}`),
      })
    }
    if (authorProfilePath.value) {
      items.push({
        label: 'View profile',
        iconName: 'tabler:user',
        command: () => navigateTo(authorProfilePath.value!),
      })
    }
    return items
  })
  function toggleAvatarMenu(event: Event) {
    ;(avatarMenuRef.value as { toggle?: (event: Event) => void } | null)?.toggle?.(event)
  }

  // ── Edit / report / delete ─────────────────────────────────────────────────
  const editOpen = ref(false)
  const reportOpen = ref(false)
  const deleting = ref(false)

  const canEditPost = computed(() => {
    if (!isSelf.value) return false
    if (isDeletedPost.value) return false
    // Replies are never editable (for anyone, including admins).
    if (postView.value.parentId) return false
    // Only-me posts are notes/drafts: allow unlimited edits (no age/edit-count cap).
    if (postView.value.visibility === 'onlyMe') return true
    // Site admins can always edit their own top-level posts with no time/count limit.
    if (viewerIsAdmin.value) return true
    const createdAt = new Date(postView.value.createdAt)
    const ageMs = nowMs.value - createdAt.getTime()
    if (!Number.isFinite(ageMs) || ageMs > 30 * 60 * 1000) return false
    const editCount = Math.max(0, Math.floor(postView.value.editCount ?? 0))
    return editCount < 3
  })

  async function openDeleteConfirm() {
    const ok = await confirm({
      header: 'Delete post?',
      message: 'This post will show as deleted, but replies will remain visible.',
      confirmLabel: 'Delete',
      confirmSeverity: 'danger',
      confirmIcon: 'tabler:trash',
    })
    if (ok) await deletePost()
  }

  async function deletePost() {
    if (deleting.value) return
    deleting.value = true
    try {
      await apiFetchData<{ success: true }>('/posts/' + encodeURIComponent(postView.value.id), { method: 'DELETE' })
      opts.onDeleted(postView.value.id)
      toast.push({ title: 'Post deleted', tone: postView.value.visibility, durationMs: 1400 })
    } catch (e: unknown) {
      toast.pushError(e, 'Failed to delete post.')
    } finally {
      deleting.value = false
    }
  }

  // ── Pin to profile / group ─────────────────────────────────────────────────
  async function pinToProfile() {
    if (postView.value.visibility === 'onlyMe') {
      toast.push({ title: 'Only-me posts cannot be pinned', tone: 'error', durationMs: 2200 })
      return
    }
    try {
      await apiFetchData<{ pinnedPostId: string }>('/users/me/pinned-post', {
        method: 'PUT',
        body: { postId: postView.value.id },
      })
      await refetchMe()
      toast.push({ title: 'Pinned to profile', tone: 'success', durationMs: 1400 })
    } catch (e: unknown) {
      toast.pushError(e, 'Failed to pin.')
    }
  }

  async function unpinFromProfile() {
    try {
      await apiFetchData<{ pinnedPostId: null }>('/users/me/pinned-post', { method: 'DELETE' })
      await refetchMe()
      toast.push({ title: 'Unpinned from profile', tone: 'success', durationMs: 1400 })
    } catch (e: unknown) {
      toast.pushError(e, 'Failed to unpin.')
    }
  }

  async function pinGroupWall() {
    const gw = opts.groupWall()
    if (!gw) return
    try {
      await apiFetchData(`/groups/${encodeURIComponent(gw.groupId)}/pin/${encodeURIComponent(postView.value.id)}`, {
        method: 'POST',
        body: {},
      })
      toast.push({ title: 'Pinned to group', tone: 'success', durationMs: 1400 })
      opts.onGroupPinChanged()
    } catch (e: unknown) {
      toast.pushError(e, 'Failed to pin.')
    }
  }

  async function unpinGroupWall() {
    const gw = opts.groupWall()
    if (!gw) return
    try {
      await apiFetchData(`/groups/${encodeURIComponent(gw.groupId)}/pin`, { method: 'DELETE' })
      toast.push({ title: 'Unpinned from group', tone: 'success', durationMs: 1400 })
      opts.onGroupPinChanged()
    } catch (e: unknown) {
      toast.pushError(e, 'Failed to unpin.')
    }
  }

  // ── Follow / block ─────────────────────────────────────────────────────────
  async function onToggleFollowAuthor() {
    const userId = author.value?.id
    const username = author.value?.username
    if (!userId || !username) return
    if (viewerFollowsAuthor.value) {
      const ok = await confirm({
        header: 'Unfollow?',
        message: `Unfollow @${username}?`,
        confirmLabel: 'Unfollow',
        confirmSeverity: 'danger',
      })
      if (!ok) return
      try {
        await followState.unfollow({ userId, username })
        toast.push({ title: `Unfollowed @${username}`, tone: 'success', durationMs: 1400 })
      } catch (e: unknown) {
        toast.pushError(e, 'Failed to unfollow.')
      }
    } else {
      try {
        await followState.follow({ userId, username })
        toast.push({ title: `Following @${username}`, tone: 'success', durationMs: 1400 })
      } catch (e: unknown) {
        toast.pushError(e, 'Failed to follow.')
      }
    }
  }

  async function handleBlockUser(userId: string) {
    try {
      await blockState.blockUser(userId)
      const handle = author.value?.username ? `@${author.value.username}` : 'User'
      toast.push({ title: `${handle} blocked`, message: 'They can still see your posts but can\'t engage with them.', tone: 'success', durationMs: 3000 })
    } catch (e: unknown) {
      toast.pushError(e, 'Failed to block user.')
    }
  }

  async function handleUnblockUser(userId: string) {
    try {
      await blockState.unblockUser(userId)
      const handle = author.value?.username ? `@${author.value.username}` : 'User'
      toast.push({ title: `${handle} unblocked`, message: 'You can now engage with their posts.', tone: 'success', durationMs: 3000 })
    } catch (e: unknown) {
      toast.pushError(e, 'Failed to unblock user.')
    }
  }

  // ── More menu ──────────────────────────────────────────────────────────────
  const openComposerFromOnlyMe = inject(MOH_OPEN_COMPOSER_FROM_ONLYME_KEY, null)

  const adminScoreLabel = computed(() => {
    if (!viewerIsAdmin.value) return null
    const overall = postView.value.internal?.score
    const boost = postView.value.internal?.boostScore
    const hasOverall = typeof overall === 'number'
    const hasBoost = typeof boost === 'number'
    if (hasOverall && hasBoost) return `Score: ${overall.toFixed(2)} (boost: ${boost.toFixed(2)})`
    if (hasOverall) return `Score: ${overall.toFixed(2)}`
    if (hasBoost) return `Boost score: ${boost.toFixed(2)}`
    return '—'
  })

  const moreMenuItems = computed<PostRowMenuItemWithIcon[]>(() => {
    const items: PostRowMenuItemWithIcon[] = []
    if (!authorBanned.value) {
      items.push({
        label: author.value?.username ? `View @${author.value.username}` : 'View profile',
        iconName: 'tabler:user',
        command: () => {
          if (!authorProfilePath.value) return
          return navigateTo(authorProfilePath.value)
        },
      })
    } else {
      items.push({ label: 'User is banned', iconName: 'tabler:user-off', disabled: true })
    }

    if (isDeletedPost.value) {
      return items
    }

    if (viewerIsAdmin.value) {
      items.push({ separator: true })
      items.push({
        label: adminScoreLabel.value ?? '—',
        iconName: 'tabler:chart-line',
        disabled: true,
      })
    }

    if (isAuthed.value && !isSelf.value && !authorBanned.value) {
      const authorId = author.value?.id ?? null
      const authorUsername = author.value?.username ?? null
      if (authorId && authorUsername) {
        items.push({
          label: viewerFollowsAuthor.value ? `Unfollow @${authorUsername}` : `Follow @${authorUsername}`,
          iconName: viewerFollowsAuthor.value ? 'tabler:user-minus' : 'tabler:user-plus',
          command: () => void onToggleFollowAuthor(),
        })
      }
    }

    if (isAuthed.value && !isSelf.value && !isGatedPost.value) {
      items.push({
        label: 'Report post',
        iconName: 'tabler:flag',
        command: () => {
          reportOpen.value = true
        },
      })

      const authorUserId = author.value?.id ?? null
      if (authorUserId && !authorBanned.value) {
        const isBlocked = blockState.isBlockedByMe(authorUserId)
          || viewerBlockStatus.value === 'viewer_blocked'
        const blockHandle = author.value?.username ? `@${author.value.username}` : 'user'
        items.push({
          label: isBlocked ? `Unblock ${blockHandle}` : `Block ${blockHandle}`,
          iconName: isBlocked ? 'tabler:ban-off' : 'tabler:ban',
          class: isBlocked ? '' : 'text-red-600 dark:text-red-400',
          command: () => {
            if (isBlocked) {
              void handleUnblockUser(authorUserId)
            } else {
              void handleBlockUser(authorUserId)
            }
          },
        })
      }
    }

    const gw = opts.groupWall()
    if (
      gw?.viewerIsOwner &&
      !isDeletedPost.value &&
      !postView.value.parentId &&
      postView.value.communityGroupId === gw.groupId
    ) {
      items.push({ separator: true })
      const isGpinned = Boolean(postView.value.pinnedInGroupAt)
      items.push({
        label: isGpinned ? 'Unpin from group top' : 'Pin to group top',
        iconName: isGpinned ? 'tabler:x' : 'tabler:pinned',
        command: () => void (isGpinned ? unpinGroupWall() : pinGroupWall()),
      })
    }

    if (isSelf.value) {
      items.push({ separator: true })
      if (!isDeletedPost.value && postView.value.visibility === 'onlyMe') {
        items.push({
          label: 'Use as draft',
          iconName: 'tabler:copy',
          command: () => {
            if (!viewerIsVerified.value) {
              showAuthActionModal({ kind: 'verify', action: 'useAsDraft' })
              return
            }
            if (openComposerFromOnlyMe) {
              openComposerFromOnlyMe(postView.value)
              return
            }
            toast.push({
              title: 'Could not open draft composer',
              message: 'Please try again from the Only me page.',
              tone: 'error',
              durationMs: 2400,
            })
          },
        })
      }
      if (canEditPost.value) {
        items.push({
          label: 'Edit post',
          iconName: 'tabler:edit',
          command: () => {
            editOpen.value = true
          },
        })
      }
      const pinnedPostId = user.value?.pinnedPostId ?? null
      const isPinned = pinnedPostId === postView.value.id
      const canPin = postView.value.visibility !== 'onlyMe'
      if (isPinned || canPin) {
        items.push({
          label: isPinned ? 'Unpin from profile' : 'Pin to profile',
          iconName: isPinned ? 'tabler:x' : 'tabler:pin',
          command: () => (isPinned ? unpinFromProfile() : pinToProfile()),
        })
      }
      items.push({
        label: 'Delete post',
        iconName: 'tabler:trash',
        class: 'text-red-600 dark:text-red-400',
        command: () => openDeleteConfirm(),
      })
    }

    return items
  })

  return {
    moreMenuItems,
    moreTooltip,
    ensureAuthorFollowLoaded,
    editOpen,
    reportOpen,
    showAvatarMenu,
    avatarMenuRef,
    avatarMenuItems,
    toggleAvatarMenu,
  }
}
