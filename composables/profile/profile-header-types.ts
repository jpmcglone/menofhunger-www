import type { FollowedByPreview, FollowRelationship, NudgeState, PublicProfile } from '~/types/api'

export interface ProfileHeaderProps {
  profile: PublicProfile | null
  profileName: string
  profileAvatarUrl: string | null
  profileBannerUrl: string | null
  hideBannerThumb: boolean
  hideAvatarThumb: boolean
  hideAvatarDuringBanner: boolean
  relationshipTagLabel: string | null
  isSelf: boolean
  canEditProfile?: boolean
  /**
   * Whether the viewer can edit this profile only because they are a site
   * admin (not the profile owner). Drives a visual cue on the Edit button.
   */
  isAdminOverride?: boolean
  followRelationship: FollowRelationship | null
  nudge: NudgeState | null
  showFollowCounts: boolean
  followerCount: number | null
  followingCount: number | null
  /** Accounts the viewer follows who also follow this profile (from the follow summary). */
  followedBy?: FollowedByPreview | null
}

export interface ProfileHeaderEmits {
  (
    e: 'openImage',
    payload: {
      event: MouseEvent
      url: string
      title: string
      kind: 'avatar' | 'banner'
      isOrganization?: boolean
      originRect?: { left: number; top: number; width: number; height: number }
    },
  ): void
  (e: 'edit' | 'followed' | 'unfollowed' | 'openFollowers' | 'openFollowing' | 'openAffiliates'): void
  (e: 'nudge-updated', payload: NudgeState | null): void
}
