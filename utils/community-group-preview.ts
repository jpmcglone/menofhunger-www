import type { CommunityGroupPreview, CommunityGroupShell, FeedPost } from '~/types/api'

const PREVIEW_LEN = 220

/** Minimal shell shape for inline post row + popover (bookmarks, etc.). */
export function groupPreviewToFeedShell(p: CommunityGroupPreview): CommunityGroupShell {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.descriptionPreview,
    rules: null,
    coverImageUrl: p.coverImageUrl,
    avatarImageUrl: p.avatarImageUrl,
    joinPolicy: p.joinPolicy,
    memberCount: p.memberCount,
    isFeatured: false,
    featuredOrder: 0,
    createdAt: '',
    viewerMembership: p.viewerMembership,
    viewerPendingApproval: p.viewerPendingApproval,
  }
}

/**
 * First non-empty `groupPreview.name` along the parent chain (group root + replies).
 */
export function feedPostThreadGroupDisplayName(start: FeedPost | null | undefined): string | null {
  let cur: FeedPost | undefined = start ?? undefined
  while (cur) {
    const name = (cur.groupPreview?.name ?? '').trim()
    if (name) return name
    cur = cur.parent
  }
  return null
}

export function shellToGroupPreview(shell: CommunityGroupShell): CommunityGroupPreview {
  const raw = (shell.description ?? '').replace(/\s+/g, ' ').trim()
  const descriptionPreview =
    raw.length <= PREVIEW_LEN ? raw : `${raw.slice(0, PREVIEW_LEN - 1)}…`
  return {
    id: shell.id,
    slug: shell.slug,
    name: shell.name,
    descriptionPreview,
    coverImageUrl: shell.coverImageUrl,
    avatarImageUrl: shell.avatarImageUrl,
    joinPolicy: shell.joinPolicy,
    memberCount: shell.memberCount,
    viewerMembership: shell.viewerMembership,
    viewerPendingApproval: shell.viewerPendingApproval,
  }
}

type JoinableGroup = {
  viewerMembership: CommunityGroupShell['viewerMembership']
  viewerPendingApproval: boolean
  memberCount: number
}

/**
 * Local membership patch after `POST /groups/:id/join`.
 * Matches the shell DTO: active members get `viewerMembership`; pending
 * requests get `viewerPendingApproval` and a null membership.
 */
export function applyCommunityGroupJoin<T extends JoinableGroup>(group: T, status: string): T {
  const pending = status === 'pending'
  const active = status === 'active'
  const alreadyActive = group.viewerMembership?.status === 'active'
  const alreadyPending = group.viewerPendingApproval
  return {
    ...group,
    viewerMembership: active
      ? { status: 'active', role: group.viewerMembership?.role ?? 'member' }
      : null,
    viewerPendingApproval: pending,
    memberCount: active && !alreadyActive && !alreadyPending
      ? group.memberCount + 1
      : group.memberCount,
  }
}

export function communityGroupJoinToast(status: string, groupName: string) {
  if (status === 'pending') {
    return { title: 'Request sent', tone: 'group' as const, durationMs: 3200 }
  }
  const name = groupName.trim()
  return {
    title: name ? `You're in ${name}` : 'Joined group',
    tone: 'group' as const,
    durationMs: 3200,
  }
}
