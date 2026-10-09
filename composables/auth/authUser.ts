import type { AccountKind, AccountSwitch, Impersonation } from '~/types/api'

export type AuthUser = {
  id: string
  createdAt?: string
  phone: string | null
  accountKind?: AccountKind
  email?: string | null
  emailVerifiedAt?: string | null
  emailVerificationRequestedAt?: string | null
  username?: string | null
  usernameIsSet?: boolean
  name?: string | null
  bio?: string | null
  website?: string | null
  /** Public custom links in display order (from realtime self updates and the links editor). */
  links?: import('~/types/api').ProfileLink[]
  xUsername?: string | null
  pickaxUsername?: string | null
  rumbleUrl?: string | null
  linkedinUrl?: string | null
  youtubeUrl?: string | null
  locationInput?: string | null
  locationDisplay?: string | null
  locationZip?: string | null
  locationCity?: string | null
  locationCounty?: string | null
  locationState?: string | null
  locationCountry?: string | null
  locationPromptSkipped?: boolean
  birthdate?: string | null
  interests?: string[]
  menOnlyConfirmed?: boolean
  heardAboutUs?: import('~/types/api').HeardAboutUs | null
  heardAboutUsOther?: string | null
  hasRecruiter?: boolean
  siteAdmin?: boolean
  featureToggles?: string[]
  premium?: boolean
  premiumPlus?: boolean
  isOrganization?: boolean
  followVisibility?: 'all' | 'verified' | 'premium' | 'none'
  birthdayVisibility?: 'none' | 'monthDay' | 'full'
  verifiedStatus?: 'none' | 'identity' | 'manual'
  verifiedAt?: string | null
  unverifiedAt?: string | null
  avatarUrl?: string | null
  avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
  bannerUrl?: string | null
  pinnedPostId?: string | null
  coins?: number
  checkinStreakDays?: number
  lastCheckinDayKey?: string | null
  longestStreakDays?: number
  openToCrew?: boolean
  notificationUndeliveredCount?: number
  messageUnreadCounts?: { primary: number; requests: number }
  notificationUnreadCommentCount?: number
  groupsUnread?: { total: number; byGroupId: Record<string, number> }
  crewInviteInboxCount?: number
  groupInviteInboxCount?: number
  postCount?: number | null
  articleCount?: number | null
  /** Non-null only while a site admin is impersonating this user. */
  impersonation?: Impersonation | null
  accountSwitch?: AccountSwitch | null
}
