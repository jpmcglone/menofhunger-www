/**
 * Hand-maintained API mirror types.
 *
 * Types that exactly match the API contract are thin aliases over
 * `./api-contracts.gen.ts` (generated from the API repo's DTO sources via
 * `npm run emit:contracts`). www-specific composites (client-only fields,
 * looser optionality) stay hand-written and are structurally checked against
 * the generated contracts in `./api-contract-check.ts`.
 */
import type * as Contracts from './api-contracts.gen'

/** Success envelope: payload in `data`, optional cursor/counts in `pagination`. */
export type ApiEnvelope<T> = { data: T; pagination?: ApiPagination }

/** Minimal org account shown alongside affiliated users. */
export type OrgAffiliation = Contracts.OrgAffiliationDto

/** Short-lived URL for transferring an authenticated native session to the browser. */
export type BrowserHandoff = Contracts.BrowserHandoffDto

export type ApiPagination = {
  nextCursor?: string | null
  counts?: {
    all: number
    public: number
    verifiedOnly: number
    premiumOnly: number
  } | null
  /** Total online users — only populated by /presence/online and /presence/online-page. */
  totalOnline?: number
  /**
   * Count of users active within the last hour who aren't currently online.
   * Only populated by /presence/online.
   */
  recentlyOnlineCount?: number
}

/** Extended pagination shape for /presence/online-page which also returns a recent-users cursor. */
export type PresencePagination = ApiPagination & {
  recentNextCursor?: string | null
}

export type ApiMetaError = {
  code: number
  message: string
  reason?: string
}

export type ApiErrorEnvelope = {
  meta: {
    status: number
    errors: ApiMetaError[]
  }
}

export type BillingTier = Contracts.BillingTier
export type SubscriptionGrantSource = Contracts.SubscriptionGrantSource

export type ActiveSubscriptionGrant = Contracts.ActiveSubscriptionGrantDto


/**
 * Where the active premium entitlement comes from.
 * Web: disable IAP CTA when source === 'apple'; show "managed on iOS".
 */
export type BillingSource = 'stripe' | 'apple' | 'grant' | null

export type BillingMe = {
  premium: boolean
  premiumPlus: boolean
  verified: boolean
  /** Where the active premium entitlement originates. */
  source: BillingSource
  subscriptionStatus: string | null
  cancelAtPeriodEnd: boolean
  /** When the current Stripe billing period ends (null if no active Stripe sub). */
  currentPeriodEnd: string | null
  /** Apple IAP subscription expiry (null if no active Apple sub). */
  appleExpiresAt: string | null
  /** Latest access expiry across Stripe + Apple + active grants. */
  effectiveExpiresAt: string | null
  /** Active (non-expired, non-revoked) subscription grants. */
  grants: ActiveSubscriptionGrant[]
  /** Referral code set by this user (premium-only). */
  referralCode: string | null
  /** Who recruited this user (null if no recruiter). */
  recruiter: {
    id: string
    username: string | null
    name: string | null
    avatarUrl: string | null
    premium: boolean
    premiumPlus: boolean
    /** The recruiter's own opt-out for the steward shield; clients must honor it. */
    stewardBadgeEnabled: boolean
    verifiedStatus: 'none' | 'identity' | 'manual'
  } | null
  /** How many users this user has recruited. */
  recruitCount: number
  /** Whether the one-time referral bonus has been granted to this user. */
  referralBonusGranted: boolean
  /**
   * True when the viewer was recruited by a paying subscriber and has not yet triggered
   * the bonus — meaning their first Premium payment will also earn them a free month.
   */
  recruitBonusEligible: boolean
}

export type Recruit = Omit<FollowListUser, 'relationship'> & {
  relationship?: FollowRelationship
  recruitedAt: string
  /** @deprecated use verifiedStatus !== 'none' */
  isVerified: boolean
  isPremium: boolean
  bonusGranted: boolean
}

export type ReferralMe = {
  referralCode: string | null
  recruiter: { username: string | null; name: string | null } | null
  recruitCount: number
  referralBonusGranted: boolean
  /** True when the viewer can claim and share a referral code (verified or premium). */
  canInvite: boolean
  /** True when the viewer has an active paid subscription (Stripe or Apple IAP). */
  isPayingPremium: boolean
  /** Total months earned from referral grants (all time). */
  monthsEarned: number
}

export type AdminReferralInfo = {
  referralCode: string | null
  bonusGrantedAt: string | null
  recruiter: { id: string; username: string | null; name: string | null } | null
  recruits: Recruit[]
}

export type AdminReferralAnalytics = {
  totalCodesCreated: number
  totalRecruits: number
  totalBonusesGranted: number
  /** Percentage of recruits who converted to premium (0–100, integer). */
  conversionRatePct: number
  recruitsOverTime: Array<{ bucket: string; count: number }>
  topRecruiters: Array<{ userId: string; username: string | null; name: string | null; recruitCount: number }>
}

// ─── Affiliate program (Referral Pilot) ──────────────────────────────────────

export type AffiliateEarningType = 'signup' | 'verified' | 'premium' | 'premium60d'

export type AffiliateEarning = {
  id: string
  recruitUserId: string
  recruitUsername: string | null
  recruitName: string | null
  type: AffiliateEarningType
  /** Amount in cents (USD). */
  amountCents: number
  createdAt: string
  settledAt: string | null
}

export type AffiliateSummary =
  | { isAffiliate: false }
  | {
      isAffiliate: true
      pendingCents: number
      settledCents: number
      /** Total lifetime earnings (pending + settled). */
      totalCents: number
      /** Minimum pending balance required to trigger a payout. */
      minPayoutCents: number
      /** Per-member lifetime earnings cap. */
      capCents: number
      /** True when totalCents >= capCents. */
      capReached: boolean
      counts: { signups: number; verified: number; premium: number; premium60d: number }
      earnings: AffiliateEarning[]
    }

export type AdminAffiliateUser = {
  userId: string
  username: string | null
  name: string | null
  affiliateAt: string
  recruitCount: number
  pendingCents: number
  settledCents: number
  /** Total lifetime earnings (pending + settled). */
  totalCents: number
  /** Per-member lifetime earnings cap. */
  capCents: number
  /** True when totalCents >= capCents. */
  capReached: boolean
}

export type AdminAffiliateSettle = {
  settledCount: number
  settledCents: number
}

/** Summary of banked free months for admin grant management UI. */
export type AdminGrantSummary = {
  premiumMonthsRemaining: number
  premiumPlusMonthsRemaining: number
}

export type BillingCheckoutSession = {
  url: string
}

export type BillingPortalSession = {
  url: string
}

export type NotificationPreferences = {
  pushComment: boolean
  pushBoost: boolean
  pushFollow: boolean
  pushMention: boolean
  pushMessage: boolean
  pushRepost: boolean
  pushNudge: boolean
  pushFollowedPost: boolean
  /** Send a single push 24h after a reply if the recipient hasn't opened it yet. Once-per-notification, never spammed. */
  pushReplyNudge: boolean
  /** Crew streak: push when the strict crew streak advances or breaks. Highest-signal push in the product. */
  pushCrewStreak: boolean
  /** Group activity: push for join, approve/reject, remove, disband events. */
  pushGroupActivity: boolean
  /** Word of the day + quote of the day push (fires at 9:00am / 9:30am ET). */
  pushDailyContent: boolean
  /** 6pm ET reminder to complete today's check-in (skipped if user already checked in). */
  pushCheckinReminder: boolean
  emailDigestWeekly: boolean
  emailNewNotifications: boolean
  emailInstantHighSignal: boolean
  emailStreakReminder: boolean
  emailFollowedArticle: boolean
}

/** Shared shape for Radio and Space lobby members (listeners/members). */
export type LobbyMember = {
  id: string
  username: string | null
  avatarUrl: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  paused?: boolean
  muted?: boolean
}

/** Shared shape for Radio and Space live-chat message senders. */
export type LiveChatSender = {
  id: string
  username: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  stewardBadgeEnabled: boolean
}

export type RadioStation = {
  id: string
  name: string
  streamUrl: string
  attributionName: string | null
  attributionUrl: string | null
}

export type RadioListener = LobbyMember

export type RadioLobbyCounts = {
  countsByStationId: Record<string, number>
}

export type RadioChatSender = LiveChatSender

export type RadioChatMessage = {
  id: string
  stationId: string
  body: string
  createdAt: string
  sender: RadioChatSender
}

export type RadioChatSnapshot = {
  stationId: string
  messages: RadioChatMessage[]
}

export type SpaceOwner = {
  id: string
  username: string | null
  avatarUrl: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
}

export type Space = {
  id: string
  title: string
  description: string | null
  isActive: boolean
  scheduledAt: string | null
  mode: 'NONE' | 'WATCH_PARTY' | 'RADIO'
  watchPartyUrl: string | null
  radioStreamUrl: string | null
  playbackTitle: string | null
  owner: SpaceOwner
  listenerCount: number
  viewerSubscribed: boolean
  subscriberCount: number
  viewerFollowsOwner: boolean
}

/** Viewer-agnostic live patch for lobby / host schedule UI (`spaces:updated`). */
export type WsSpacesUpdatedPayload = {
  spaceId: string
  version: string
  reason: string
  patch: Partial<{
    title: string
    description: string | null
    isActive: boolean
    scheduledAt: string | null
    mode: 'NONE' | 'WATCH_PARTY' | 'RADIO'
    watchPartyUrl: string | null
    radioStreamUrl: string | null
    playbackTitle: string | null
    subscriberCount: number
    deleted: boolean
  }>
}

export type SpaceMember = LobbyMember

export type WatchPartyState = {
  videoUrl: string
  isPlaying: boolean
  currentTime: number
  playbackRate: number
  updatedAt: number
}

export type SpaceModeChanged = {
  spaceId: string
  mode: 'NONE' | 'WATCH_PARTY' | 'RADIO'
  watchPartyUrl: string | null
  radioStreamUrl: string | null
}

export type SpaceLobbyCounts = {
  countsBySpaceId: Record<string, number>
}

export type SpaceChatSender = LiveChatSender

export type SpaceChatMediaItem = {
  url: string
  width: number | null
  height: number | null
  alt: string | null
}

export type SpaceChatReactionSummary = {
  reactionId: string
  emoji: string
  count: number
  reactedByMe: boolean
  reactors: { id: string; username: string | null }[]
}

export type SpaceChatMessage =
  | {
      id: string
      spaceId: string
      kind: 'user'
      body: string
      media?: SpaceChatMediaItem[]
      createdAt: string
      sender: SpaceChatSender
      replyToId?: string | null
      /** Client-resolved. Absent when this browser never had the parent. */
      replyTo?: MessageReplySnippet | null
      reactions?: SpaceChatReactionSummary[]
    }
  | {
      id: string
      spaceId: string
      kind: 'system'
      system: {
        firstEvent: 'join' | 'leave'
        lastEvent: 'join' | 'leave'
        userId: string
        username: string | null
      }
      body: string
      createdAt: string
      sender: null
    }

export type SpaceChatSnapshot = {
  spaceId: string
  messages: SpaceChatMessage[]
}

export type SpaceReaction = {
  id: string
  emoji: string
  label: string
}

export type SpaceReactionEvent = {
  spaceId: string
  userId: string
  reactionId: string
  emoji: string
}

export type SpaceChatReactionEvent = {
  spaceId: string
  messageId: string
  userId: string
  username: string | null
  reactionId: string
  emoji: string
}

export type Websters1828WordOfDay = {
  word: string
  dictionaryUrl: string
  definition: string | null
  definitionHtml: string | null
  sourceUrl: string
  fetchedAt: string
  likeCount: number
  viewerHasLiked: boolean
}

export type WotdLikeBreakdown = {
  premium: number
  verified: number
  unverified: number
  total: number
}

export type WotdLikeToggle = {
  liked: boolean
  likeCount: number
}

export type DailyQuoteKind = 'scripture' | 'quote' | 'paraphrase'
export type DailyQuote = {
  id: string
  kind: DailyQuoteKind
  author: string
  reference: string | null
  text: string
  isParaphrase: boolean
  tradition?: string
  note?: string
  sourceUrl?: string
}

export type DailyContentToday = {
  /** Eastern Time day key (YYYY-MM-DD). */
  dayKey: string
  quote: DailyQuote | null
  quoteRefreshedAt: string | null
  websters1828: Websters1828WordOfDay | null
  websters1828RefreshedAt: string | null
  /** UTC ISO timestamp of the next content publish boundary (9:00am ET for word, 9:30am ET for quote). */
  nextPublishAt: string | null
  /** UTC ISO timestamp of when today's word-of-the-day will (or did) publish: 09:00 ET. */
  nextWordPublishAt: string | null
  /** UTC ISO timestamp of when today's quote-of-the-day will (or did) publish: 09:30 ET. */
  nextQuotePublishAt: string | null
}

export type AdminEmailSampleType = 'weekly_digest' | 'new_notifications' | 'instant_high_signal' | 'streak_reminder'
export type AdminEmailSampleSendResult = {
  sent: boolean
  reason: string | null
  type: AdminEmailSampleType
}

export type FeedbackCategory = Contracts.FeedbackCategory
export type FeedbackStatus = Contracts.FeedbackStatus

export type ReportTargetType = Contracts.ReportTargetType
export type ReportReason = Contracts.ReportReason
export type ReportStatus = Contracts.ReportStatus

export type PostVisibility = Contracts.PostVisibility

export type PostMediaKind = Contracts.PostMediaKind
export type PostMediaSource = Contracts.PostMediaSource

export type PostMedia = Contracts.PostMediaDto

export type PostPollOption = Contracts.PostPollOptionDto

export type PostPoll = Contracts.PostPollDto

export type PostAuthor = {
  id: string
  username: string | null
  name: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  stewardBadgeEnabled: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl: string | null
  orgAffiliations?: OrgAffiliation[]
  isBot?: boolean
  /** When true, author is banned; id/username/name/avatar are redacted. */
  authorBanned?: boolean
}

export type PostMention = Contracts.PostMentionDto

/** Public profile payload from GET /users/:username */
export type PublicProfile = {
  id: string
  createdAt: string
  username: string | null
  name: string | null
  bio: string | null
  website: string | null
  xUsername: string | null
  pickaxUsername: string | null
  locationDisplay: string | null
  locationZip: string | null
  locationCity: string | null
  locationCounty: string | null
  locationState: string | null
  locationCountry: string | null
  birthdayDisplay: string | null
  birthdayMonthDay: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  stewardBadgeEnabled: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl: string | null
  bannerUrl: string | null
  pinnedPostId: string | null
  lastOnlineAt: string | null
  checkinStreakDays: number
  longestStreakDays: number
  postCount?: number
  articleCount?: number
  orgAffiliations?: OrgAffiliation[]
  /** True when the viewer has blocked this user. */
  viewerHasBlockedUser?: boolean
  /** True when this user has blocked the viewer. */
  userHasBlockedViewer?: boolean
  /** True when this user is an active member of any Crew. */
  inCrew?: boolean
  isBot?: boolean
}

/**
 * Compact entry from POST /users/preview/batch — used by chat to validate
 * @mentions in bulk without firing one HTTP per username.
 */
export type UserPreviewBatchEntry = {
  /** Echoed back lowercased. */
  username: string
  /** `null` when the username does not resolve to a real user. */
  id: string | null
  premium?: boolean
  premiumPlus?: boolean
  isOrganization?: boolean
  stewardBadgeEnabled?: boolean
  verifiedStatus?: 'none' | 'identity' | 'manual'
}

export type UserPreviewBatchResponse = {
  data: { results: UserPreviewBatchEntry[] }
}

/** Hover preview payload from GET /users/:username/preview */
export type UserPreview = {
  id: string
  username: string | null
  name: string | null
  bio: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  stewardBadgeEnabled: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl: string | null
  bannerUrl: string | null
  lastOnlineAt: string | null
  checkinStreakDays: number
  longestStreakDays: number
  relationship: FollowRelationship
  nudge: NudgeState | null
  followerCount: number | null
  followingCount: number | null
  orgAffiliations?: OrgAffiliation[]
  isBot?: boolean
  locationDisplay: string | null
  locationState: string | null
}

/** Compact group card for gated posts and discovery. */
export type CommunityGroupPreview = {
  id: string
  slug: string
  name: string
  descriptionPreview: string
  coverImageUrl: string | null
  avatarImageUrl: string | null
  joinPolicy: 'open' | 'approval'
  memberCount: number
  viewerMembership: { status: 'active' | 'pending'; role: 'owner' | 'moderator' | 'member' } | null
  viewerPendingApproval: boolean
}

export type FeedPost = {
  id: string
  createdAt: string
  editedAt?: string | null
  editCount?: number
  body: string
  deletedAt: string | null
  kind?: 'regular' | 'checkin' | 'repost' | 'articleShare' | 'status' | 'fitnessShare'
  checkinDayKey?: string | null
  checkinPrompt?: string | null
  visibility: PostVisibility
  isDraft?: boolean
  topics?: string[]
  /** User-created hashtags parsed from body text (lowercase, without '#'). */
  hashtags?: string[]
  /** Validated cashtag symbols parsed from body text (uppercase, without '$', e.g. "SPY"). */
  cashtags?: string[]
  boostCount: number
  bookmarkCount: number
  commentCount?: number
  /** Denormalized count of flat reposts + quote reposts referencing this post. */
  repostCount?: number
  viewerCount?: number
  parentId?: string | null
  /** When set, post is scoped to a community group (not on global feeds). */
  communityGroupId?: string | null
  /** Present on group root posts when pinned by owner. */
  pinnedInGroupAt?: string | null
  /** When viewer cannot read a group post, join CTA context. */
  groupPreview?: CommunityGroupPreview | null
  /** When present, this post is a reply and the parent is included for thread display. */
  parent?: FeedPost
  mentions?: PostMention[]
  media: PostMedia[]
  poll?: PostPoll | null
  viewerHasBoosted?: boolean
  viewerHasBookmarked?: boolean
  viewerBookmarkCollectionIds?: string[]
  /** True if the viewer has flat-reposted this post. */
  viewerHasReposted?: boolean
  /** True if the viewer has viewed this post (exists in PostView table). */
  viewerHasViewed?: boolean
  /** Set when a block exists between viewer and author. */
  viewerBlockStatus?: 'viewer_blocked' | 'viewer_blocked_by' | null
  /** For kind='repost': the original post being reshared. */
  repostedPost?: FeedPost
  /** For posts containing an embedded post link: the quoted post (preloaded). */
  quotedPost?: FeedPost
  /**
   * When multiple followed accounts reposted the same original on this feed page,
   * the repost rows are collapsed into one. Lists the reposting authors (followed
   * accounts first, up to 5). Present only when ≥ 2 were collapsed.
   */
  repostedByAuthors?: PostAuthor[]
  /** Total number of repost rows collapsed into this one. Present only when > 1. */
  repostedByCount?: number
  /** For kind='articleShare': the shared article preview. */
  article?: ArticleSharePreview
  /** For kind='fitnessShare': the frozen fitness share snapshot. */
  fitnessShare?: FitnessSharePreview
  /** When true, post body/media/mentions/poll are redacted and author is placeholder. */
  authorBanned?: boolean
  /** False when the viewer's tier does not grant access; body/media stripped. */
  viewerCanAccess?: boolean
  /**
   * When set, this many other trending/new items from the same root thread were
   * collapsed by the API and are not shown in the feed. Used to render accurate
   * "View N more trending replies" footers.
   */
  threadCollapsedCount?: number
  /** Unique authors of collapsed sibling replies (feed order). */
  threadCollapsedAuthors?: PostAuthor[]
  internal?: {
    boostScore: number | null
    boostScoreUpdatedAt: string | null
    /** Overall popularity score (from popular feed). Admin only. */
    score?: number | null
  }
  author: PostAuthor
  // ── Client-only fields ─────────────────────────────────────────────────────
  // Set on optimistic posts that have been added to a feed but not yet
  // confirmed by the server. Never returned by the API; never serialized.
  /** 'posting' while in flight; 'failed' after a failed attempt. */
  _pending?: 'posting' | 'failed' | null
  /** Stable id used to find/replace this row across pending → real transitions. */
  _localId?: string | null
  /** User-facing error message when `_pending === 'failed'`. */
  _pendingError?: string | null
}

export type PostViewBreakdown = {
  premium: number
  verified: number
  unverified: number
  guest: number
  total: number
}

export type ArticleViewBreakdown = {
  premium: number
  verified: number
  unverified: number
  guest: number
  total: number
}

export type BookmarkCollection = {
  id: string
  name: string
  slug: string
  bookmarkCount: number
  createdAt: string
  updatedAt: string
}

export type ListBookmarkCollectionsResponse = {
  collections: BookmarkCollection[]
  summary?: {
    totalCount: number
    unorganizedCount: number
  }
}

export type CreateBookmarkCollectionResponse = {
  collection: BookmarkCollection
}

export type RenameBookmarkCollectionResponse = {
  collection: BookmarkCollection
}

export type DeleteBookmarkCollectionResponse = {
  success: true
}

export type SetBookmarkResponse = {
  success: true
  bookmarked: true
  bookmarkId: string
  collectionIds: string[]
}

export type RemoveBookmarkResponse = {
  success: true
  bookmarked: false
}

/** Single bookmark item (search/bookmarks list); pagination in envelope. */
export type SearchBookmarkItem = {
  bookmarkId: string
  createdAt: string
  collectionIds: string[]
  post: FeedPost
}

export type SearchBookmarksResponse = {
  bookmarks: SearchBookmarkItem[]
  nextCursor: string | null
}

/** Data type for GET /posts (array); pagination in envelope. */
export type GetPostsData = FeedPost[]

export type GetPostsResponse = {
  posts: FeedPost[]
  nextCursor: string | null
}

/** Data type for GET /posts/:id (single post). */
export type GetPostData = FeedPost

export type GetPostResponse = {
  post: FeedPost
}

/** Data type for GET /posts/:id/comments (array); pagination in envelope. */
export type GetPostCommentsData = FeedPost[]

export type GetPostCommentsResponse = {
  comments: FeedPost[]
  nextCursor: string | null
  counts?: {
    all: number
    public: number
    verifiedOnly: number
    premiumOnly: number
  } | null
}

/** Data type for GET /posts/:id/discover-more (array); pagination in envelope. */
export type GetPostDiscoverMoreData = FeedPost[]

export type GetPostDiscoverMoreResponse = {
  posts: FeedPost[]
  nextCursor: string | null
}

/** Data type for GET /posts/:id/thread-participants (array). */
export type GetThreadParticipantsData = Array<{ id: string; username: string }>

export type GetThreadParticipantsResponse = {
  participants: GetThreadParticipantsData
}

/** Data type for GET /posts/user/:username (array); pagination in envelope. */
export type GetUserPostsData = FeedPost[]

export type GetUserPostsResponse = {
  posts: FeedPost[]
  nextCursor: string | null
  counts: {
    all: number
    public: number
    verifiedOnly: number
    premiumOnly: number
  } | null
}

export type AdminImageReviewBelongsTo =
  | 'post'
  | 'post_thumbnail'
  | 'message'
  | 'message_thumbnail'
  | 'user'
  | 'group'
  | 'crew'
  | 'poll'
  | 'article'
  | 'article_inline'
  | 'orphan'

export type AdminImageReviewListItem = {
  id: string
  r2Key: string
  kind: PostMediaKind | null
  lastModified: string
  publicUrl: string | null
  deletedAt: string | null
  belongsToSummary: AdminImageReviewBelongsTo
  postId: string | null
  authorUsername: string | null
  userId: string | null
  profileUsername: string | null
  groupId?: string | null
  groupName?: string | null
  groupSlug?: string | null
  crewId?: string | null
  crewName?: string | null
  crewSlug?: string | null
  pollPostId?: string | null
  articleId?: string | null
  articleSlug?: string | null
  messageId?: string | null
}

export type FeedbackItem = {
  id: string
  createdAt: string
  updatedAt: string
  category: FeedbackCategory
  status: FeedbackStatus
  email: string | null
  subject: string
  details: string
}

export type AdminFeedbackItem = FeedbackItem & {
  adminNote: string | null
  user: { id: string; username: string | null; name: string | null; avatarUrl: string | null } | null
}

/** Data type for GET /admin/feedback (array); pagination in envelope. */
export type AdminFeedbackListData = AdminFeedbackItem[]

export type ReportItem = {
  id: string
  createdAt: string
  updatedAt: string
  targetType: ReportTargetType
  reason: ReportReason
  details: string | null
  status: ReportStatus
  subjectUserId: string | null
  subjectPostId: string | null
}

export type AdminReportItem = ReportItem & {
  adminNote: string | null
  resolvedAt: string | null
  reporter: { id: string; username: string | null; name: string | null }
  subjectUser: { id: string; username: string | null; name: string | null } | null
  subjectPost: {
    id: string
    createdAt: string
    body: string
    deletedAt: string | null
    user: { id: string; username: string | null; name: string | null }
  } | null
  resolvedByAdmin: { id: string; username: string | null; name: string | null } | null
}

/** Data type for GET /admin/reports (array); pagination in envelope. */
export type AdminReportListData = AdminReportItem[]

export type VerificationRequestStatus = Contracts.VerificationRequestStatus

export type VerificationRequestPublic = {
  id: string
  createdAt: string
  updatedAt: string
  status: VerificationRequestStatus
  provider: string | null
  providerRequestId: string | null
  reviewedAt: string | null
  rejectionReason: string | null
}

/** Data type for GET /verification/me. */
export type MyVerificationStatus = {
  verifiedStatus: 'none' | 'identity' | 'manual'
  verifiedAt: string | null
  unverifiedAt: string | null
  latestRequest: VerificationRequestPublic | null
}

export type AdminVerificationUser = {
  id: string
  createdAt: string
  phone: string
  email: string | null
  username: string | null
  usernameIsSet: boolean
  name: string | null
  siteAdmin: boolean
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  stewardBadgeEnabled: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  verifiedAt: string | null
  unverifiedAt: string | null
}

export type AdminVerificationRequest = VerificationRequestPublic & {
  adminNote: string | null
  reviewedByAdmin: { id: string; username: string | null; name: string | null } | null
  user: AdminVerificationUser
}

/** Data type for GET /admin/verification (array); pagination in envelope. */
export type AdminVerificationListData = AdminVerificationRequest[]

/** Data type for GET /admin/media-review (array); pagination in envelope. */
export type AdminImageReviewListData = AdminImageReviewListItem[]

/** Data type for GET /admin/media-review/:id (asset + references). */
export type AdminImageReviewDetailResponse = {
  asset: {
    id: string
    r2Key: string
    lastModified: string
    bytes: number | null
    contentType: string | null
    kind: PostMediaKind | null
    width: number | null
    height: number | null
    deletedAt: string | null
    deleteReason: string | null
    r2DeletedAt: string | null
    publicUrl: string | null
    primaryType: AdminImageReviewBelongsTo
  }
  references: {
    posts: Array<{
      postMediaId: string
      postId: string
      postCreatedAt: string
      postVisibility: PostVisibility
      author: { id: string; username: string | null }
      deletedAt: string | null
      isThumbnail: boolean
    }>
    messages: Array<{
      messageMediaId: string
      messageId: string
      conversationId: string
      isThumbnail: boolean
    }>
    users: Array<{
      id: string
      username: string | null
      name: string | null
      premium: boolean
      premiumPlus: boolean
      stewardBadgeEnabled: boolean
      verifiedStatus: 'none' | 'identity' | 'manual'
      isAvatar: boolean
      isBanner: boolean
    }>
    groups: Array<{
      groupId: string
      slug: string
      name: string
      isAvatar: boolean
      isCover: boolean
    }>
    crews: Array<{
      crewId: string
      slug: string
      name: string | null
      isAvatar: boolean
      isCover: boolean
    }>
    polls: Array<{
      pollOptionId: string
      pollId: string
      postId: string
    }>
    articles: Array<{
      articleId: string
      slug: string
      title: string | null
      authorId: string
      isInline: boolean
    }>
  }
}

export type AdminImageReviewDeleteResponse = {
  success: true
  alreadyDeleted?: boolean
  r2Deleted?: boolean
  error?: string
  postMediaCount?: number
  postMediaThumbnailCount?: number
  messageMediaCount?: number
  messageMediaThumbnailCount?: number
  userCount?: number
  groupCount?: number
  crewCount?: number
  pollOptionCount?: number
  articleCount?: number
  articleThumbCount?: number
  articleInlineCount?: number
}

/** Status payload for GET /admin/jobs/hashtags/backfill. */
export type AdminHashtagBackfillStatus = {
  id: string
  status: string
  cursor: string | null
  processedPosts: number
  updatedPosts: number
  resetDone: boolean
  startedAt: string
  finishedAt: string | null
  lastError: string | null
  updatedAt: string
}

/** One queue's worker liveness + backlog depth, from GET /admin/jobs/queues. */
export type AdminQueueHealth = {
  name: string
  /** Consumers registered with Redis for this queue. Zero means nothing is draining it. */
  workers: number
  waiting: number
  active: number
  delayed: number
  failed: number
  paused: boolean
  /** Set when the readout itself failed (Redis down); counts are then all zero. */
  error: string | null
}

/** Data payload for GET /admin/jobs/queues. */
export type AdminQueuesHealth = {
  queues: AdminQueueHealth[]
  allQueuesHaveWorkers: boolean
}

export type PostStreakReward = {
  coinsEarned: number
  streakDays: number
  multiplier: 1 | 2 | 3 | 4
}

/** Data type for POST /posts (created post). */
export type CreatePostData = {
  post: FeedPost
  streakReward: PostStreakReward | null
}

/** Response for POST /posts/:id/repost */
export type RepostResponse = {
  reposted: true
  repostId: string
  repostCount: number
}

/** Response for DELETE /posts/:id/repost */
export type UnrepostResponse = {
  reposted: false
  repostCount: number
}

export type GiphyItem = {
  id: string
  title: string
  url: string
  mp4Url: string | null
  width: number | null
  height: number | null
}

/** Data type for GET /giphy/search and /giphy/trending (array). */
export type GiphySearchResponse = GiphyItem[]

export type FollowVisibility = Contracts.FollowVisibility
export type BirthdayVisibility = Contracts.BirthdayVisibility

export type FollowRelationship = {
  viewerFollowsUser: boolean
  userFollowsViewer: boolean
  viewerPostNotificationsEnabled: boolean
}

export type NudgeState = {
  outboundPending: boolean
  inboundPending: boolean
  inboundNotificationId: string | null
  outboundExpiresAt: string | null
}

export type FollowSummaryResponse = FollowRelationship & {
  canView: boolean
  followerCount: number | null
  followingCount: number | null
  nudge: NudgeState | null
}

export type FollowListUser = {
  id: string
  username: string | null
  name: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  stewardBadgeEnabled: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl: string | null
  orgAffiliations?: OrgAffiliation[]
  relationship: FollowRelationship
  /** True when this user is an active member of any Crew. Present on search results. */
  inCrew?: boolean
}

/** Search user result (FollowListUser + createdAt for interleaving). */
export type SearchUserResult = FollowListUser & { createdAt?: string }

export type HashtagResult = {
  /** Canonical lowercase tag value (no '#'). */
  value: string
  /** Display label (most common casing). */
  label: string
  usageCount: number
}

export type CashtagResult = {
  /** Uppercase ticker symbol (no '$'), e.g. "SPY". */
  symbol: string
  /** Full company or ETF name, e.g. "SPDR S&P 500 ETF Trust". */
  name: string
}

export type TaxonomyKind = 'topic' | 'subtopic' | 'tag'

export type TaxonomyMatch = {
  id: string
  slug: string
  label: string
  kind: TaxonomyKind
  score: number
  aliases: string[]
}

/** Mixed search result: users + posts. */
export type SearchMixedResult = {
  users: SearchUserResult[]
  posts: FeedPost[]
  articles: Article[]
  groups?: CommunityGroupShell[]
  taxonomyMatches?: TaxonomyMatch[]
  /** Number of posts/articles excluded from results due to visibility gating (for upsell). */
  gatedResultCount?: number
}

/** Pagination for mixed search (two cursors). */
export type SearchMixedPagination = {
  nextUserCursor?: string | null
  nextPostCursor?: string | null
  nextArticleCursor?: string | null
}

/** Data type for GET /search?type=all. */
export type SearchMixedResponse = {
  data: SearchMixedResult
  pagination?: SearchMixedPagination
}

/** Data type for GET /follows/:username/followers and /following (array); pagination in envelope. */
export type GetFollowsListData = FollowListUser[]

/** Data type for GET /follows/recommendations (array). */
export type GetFollowRecommendationsData = FollowListUser[]

/** Data type for GET /users/newest (array). */
export type GetNewestUsersData = FollowListUser[]

export type UserStatus = Contracts.UserStatusDto

export type OnlineUser = FollowListUser & {
  lastConnectAt?: number
  idle?: boolean
  status?: UserStatus | null
  /**
   * True only for the synthetic Marv pin row injected by the API when Marv is enabled.
   * The frontend uses this to sort bots to the top and render a small badge.
   */
  isBot?: boolean
  /**
   * Deduped list of client platforms this user is currently connected from
   * (e.g. ['ios', 'web']). Populated from the in-memory presence service on the
   * responding instance; may be empty for multi-instance deployments.
   */
  platforms?: string[]
}

/** Data type for GET /presence/online (array); totalOnline in pagination. */
export type GetPresenceOnlineData = OnlineUser[]

export type RecentlyOnlineUser = FollowListUser & {
  lastOnlineAt: string | null
  status?: UserStatus | null
  /** True for bot accounts (e.g. Marv). Bots are always online and must not appear in the "recently around" section. */
  isBot?: boolean
}

/** Data type for GET /presence/recent (array); nextCursor in pagination. */
export type GetPresenceRecentData = RecentlyOnlineUser[]

/** Data type for GET /presence/statuses (array). */
export type GetPresenceStatusesData = UserStatus[]

export type PresenceOnlinePage = {
  online: OnlineUser[]
  recent: RecentlyOnlineUser[]
}

/** Data type for GET /presence/online-page (object); totalOnline + recentNextCursor in pagination. */
export type GetPresenceOnlinePageData = PresenceOnlinePage

export type ActiveUsersMetrics = {
  dau: number
  mau: number
  dauWindowDays: number
  mauWindowDays: number
  /** ISO timestamp of when the metric was computed. */
  asOf: string
}

/** Data type for GET /metrics/active-users. */
export type GetActiveUsersMetricsData = ActiveUsersMetrics

export type Topic = {
  topic: string
  category: string
  categoryLabel: string
  score: number
  interestCount: number
  postCount: number
  viewerFollows?: boolean
}

export type TopicCategory = {
  category: string
  label: string
  score: number
  interestCount: number
  postCount: number
}

/** Data type for GET /topics (array). */
export type GetTopicsData = Topic[]

/** Data type for GET /topics/followed (array). */
export type GetFollowedTopicsData = Topic[]

/** Data type for GET /topics/:topic/posts (array); pagination in envelope. */
export type GetTopicPostsData = FeedPost[]

/** Data type for GET /topics/categories (array). */
export type GetTopicCategoriesData = TopicCategory[]

/** Data type for GET /topics/categories/:category/topics (array). */
export type GetCategoryTopicsData = Topic[]

/** Data type for GET /topics/categories/:category/posts (array); pagination in envelope. */
export type GetCategoryPostsData = FeedPost[]

export type TopicOption = {
  value: string
  label: string
  group: string
  aliases: string[]
}

/** Data type for GET /topics/options (array). */
export type GetTopicOptionsData = TopicOption[]

/** Data type for GET /hashtags/trending (array); pagination in envelope. */
export type GetTrendingHashtagsData = HashtagResult[]

export type NotificationKind = Contracts.NotificationKind

export type NotificationGroupKind = 'comment' | 'boost' | 'repost' | 'follow' | 'followed_post' | 'nudge'

export type NotificationActor = Contracts.NotificationActorDto

export type SubjectPostPreview = Contracts.SubjectPostPreviewDto

export type SubjectArticlePreview = Contracts.SubjectArticlePreviewDto

/** Tier of the notification subject (post visibility or user tier) for unseen row highlight. */
export type SubjectTier = 'premium' | 'verified' | null

export type Notification = {
  id: string
  createdAt: string
  kind: NotificationKind
  deliveredAt: string | null
  readAt: string | null
  ignoredAt: string | null
  nudgedBackAt: string | null
  actor: NotificationActor | null
  /** The post that caused this notification (e.g. a reply or mention post). */
  actorPostId: string | null
  subjectPostId: string | null
  subjectUserId: string | null
  subjectArticleId: string | null
  subjectArticleCommentId: string | null
  subjectGroupId: string | null
  /** Slug of the subject group (only populated for group_join_request notifications). */
  subjectGroupSlug?: string | null
  /** Display name of the subject group (only populated for group_join_request notifications). */
  subjectGroupName?: string | null
  /** Avatar URL of the subject group (populated for marv_not_in_group and group_join_request). */
  subjectGroupAvatarUrl?: string | null
  /** Crew this notification is about (any crew_* kind that has a real crew). */
  subjectCrewId: string | null
  /** Specific crew invite (crew_invite_received and related) — used for inline accept/decline. */
  subjectCrewInviteId: string | null
  /**
   * Lifecycle status of `subjectCrewInviteId`, when present. Lets the row render the
   * correct terminal state ("Joined crew", "Declined", "No longer available") on a
   * fresh load without an extra fetch.
   */
  subjectCrewInviteStatus: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired' | null
  /**
   * Display name of the crew this notification refers to. For founding invites
   * (no Crew yet) this falls back to `CrewInvite.crewNameOnAccept`. Null when
   * the crew is still untitled — the row should render "their crew" in that case.
   */
  subjectCrewName: string | null
  /**
   * Specific community-group invite this notification refers to (set for
   * `community_group_invite_*` kinds). Lets the row accept/decline directly.
   */
  subjectCommunityGroupInviteId?: string | null
  /**
   * Lifecycle status of `subjectCommunityGroupInviteId`, when present. Mirrors
   * `subjectCrewInviteStatus` so the row can render the correct terminal state
   * ("Joined", "Declined", "No longer available") on a fresh load.
   */
  subjectCommunityGroupInviteStatus?: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'expired' | null
  /** Conversation this notification is about (used for `message` kind). */
  subjectConversationId?: string | null
  /** Space this notification is about (schedule reminders / live / cancelled). */
  subjectSpaceId?: string | null
  /** Owner username for deep-linking to `/s/:username`. */
  subjectSpaceOwnerUsername?: string | null
  title: string | null
  body: string | null
  subjectPostPreview?: SubjectPostPreview | null
  /** Full post row payload for notifications that render as posts. */
  post?: FeedPost | null
  /** When subject is an article (followed_article), article card preview. */
  subjectArticlePreview?: SubjectArticlePreview | null
  /** When subject is a post, its visibility (used for UI tinting). */
  subjectPostVisibility?: PostVisibility | null
  /** Tier of subject (post or user) for unseen row highlight. */
  subjectTier?: SubjectTier
}

export type NotificationGroup = {
  id: string
  kind: NotificationGroupKind
  createdAt: string
  deliveredAt: string | null
  readAt: string | null
  subjectPostId: string | null
  subjectUserId: string | null
  actors: NotificationActor[]
  actorCount: number
  count: number
  latestBody: string | null
  latestSubjectPostPreview: SubjectPostPreview | null
  subjectPostVisibility: PostVisibility | null
  subjectTier: SubjectTier
}

export type FollowedPostsRollup = {
  id: string
  createdAt: string
  deliveredAt: string | null
  readAt: string | null
  actors: NotificationActor[]
  actorCount: number
  count: number
}

export type NotificationFeedItem =
  | { type: 'single'; notification: Notification }
  | { type: 'group'; group: NotificationGroup }
  | { type: 'followed_posts_rollup'; rollup: FollowedPostsRollup }

export type GetNotificationsData = NotificationFeedItem[]

export type GetNotificationsResponse = {
  data: NotificationFeedItem[]
  pagination: {
    nextCursor: string | null
    undeliveredCount: number
    unreadByKind?: Partial<Record<NotificationKind | 'all', number>>
  }
}

/** Data type for GET /notifications/new-posts (array); pagination in envelope. */
export type GetNotificationsNewPostsData = FeedPost[]

export type GetNotificationsNewPostsResponse = {
  data: FeedPost[]
  pagination: {
    nextCursor: string | null
  }
}

export type GetNotificationsUnreadCountResponse = {
  data: {
    count: number
    /** Unread reply (kind: 'comment') notifications — drives the "waiting on you" dot on the Home tab. */
    unreadCommentCount: number
  }
}

export type MessageConversationType = 'direct' | 'group' | 'crew_wall'

/**
 * Lightweight crew summary attached to `crew_wall` conversations so the chat
 * list/header can render the crew avatar, label the row as a Crew chat, and
 * deep-link to /c/:slug without a per-row round-trip.
 */
export type MessageConversationCrewSummary = {
  id: string
  slug: string
  /** Display name; null when the crew hasn't been named yet. */
  name: string | null
  avatarUrl: string | null
}
export type MessageParticipantStatus = 'pending' | 'accepted'
export type MessageParticipantRole = 'owner' | 'member'

export type MessageUser = {
  id: string
  username: string | null
  name: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  stewardBadgeEnabled: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl: string | null
  isBot?: boolean
}

export type MessageParticipant = {
  user: MessageUser
  status: MessageParticipantStatus
  role: MessageParticipantRole
  acceptedAt: string | null
  lastReadAt: string | null
}

export type MessageReactionSummary = {
  reactionId: string
  emoji: string
  count: number
  reactedByMe: boolean
  reactors: { id: string; username: string | null; avatarUrl: string | null }[]
}

export type MessageReplySnippet = Contracts.MessageReplySnippetDto

export type MessageReaction = {
  id: string
  emoji: string
  label: string
}

export type MessageMedia = Contracts.MessageMediaDto

export type Message = {
  id: string
  createdAt: string
  body: string
  conversationId: string
  sender: MessageUser
  reactions: MessageReactionSummary[]
  deletedForMe: boolean
  /** True when the sender deleted this message for all participants. */
  deletedForAll: boolean
  /** ISO string of when the message was last edited, or null. */
  editedAt: string | null
  replyTo: MessageReplySnippet | null
  media: MessageMedia[]
}

export type MessageConversation = {
  id: string
  type: MessageConversationType
  title: string | null
  createdAt: string
  updatedAt: string
  lastMessageAt: string | null
  lastMessage: { id: string; body: string; createdAt: string; senderId: string } | null
  participants: MessageParticipant[]
  viewerStatus: MessageParticipantStatus
  unreadCount: number
  /** True when the viewer has muted notifications for this conversation. */
  isMuted: boolean
  /** True when a block exists in either direction between viewer and the other participant (direct chats only). */
  isBlockedWith?: boolean
  /** Present on search results when a message body matched the query. */
  matchedMessage?: { id: string; body: string; createdAt: string } | null
  /**
   * Populated only for `crew_wall` conversations. Lets the chat row render the
   * crew avatar/name and link to the crew's public page.
   */
  crew?: MessageConversationCrewSummary | null
}

export type GetMessageConversationsData = MessageConversation[]

export type GetMessageConversationsResponse = {
  data: MessageConversation[]
  pagination: { nextCursor: string | null }
}

export type GetMessageConversationResponse = {
  data: { conversation: MessageConversation; messages: Message[] }
  pagination: { nextCursor: string | null }
}

export type GetMessagesResponse = {
  data: Message[]
  pagination: { nextCursor: string | null }
}

export type CreateMessageConversationResponse = {
  data: { conversationId: string; message: Message }
}

export type SendMessageResponse = {
  data: { message: Message }
}

export type GetMessagesUnreadCountResponse = {
  data: { primary: number; requests: number }
}

export type LookupMessageConversationResponse = {
  data: { conversationId: string | null }
}

export type SearchMessageConversationsResponse = {
  data: MessageConversation[]
}

export type MessagesAroundResponse = {
  data: {
    messages: Message[]
    olderCursor: string | null
    newerCursor: string | null
    targetMessageId: string
  }
}

export type MessageBlockListItem = {
  blocked: MessageUser
  createdAt: string
}

export type GetMessageBlocksResponse = {
  data: MessageBlockListItem[]
}

// --- Websocket (Socket.IO) payload types ---

export type WsNotificationsNewPayload = {
  notification: Notification
  /**
   * True when this event only re-renders an already-seen notification (e.g. the actor
   * reworded their active status). The row's unread state and the bell count are
   * untouched, so clients must patch quietly: no sound, no badge change, no highlight.
   */
  silent?: boolean
}

export type WsNotificationsDeletedPayload = {
  notificationIds: string[]
}

export type WsNotificationsUpdatedPayload = {
  undeliveredCount?: number
  /** Post ids whose related notifications were just marked read (subject or actor). */
  clearedPostIds?: string[]
}

export type WsNotificationsLockScreenClearPayload = {
  section: 'inbox' | 'groups'
}

export type WsMessagesReadPayload = {
  conversationId: string
  userId: string
  lastReadAt: string
}

export type WsFollowsChangedPayload = {
  actorUserId: string
  targetUserId: string
  viewerFollowsUser: boolean
}

export type WsPostInteractionKind = 'boost' | 'bookmark' | 'repost'
export type WsPostsInteractionPayload = {
  postId: string
  actorUserId: string
  kind: WsPostInteractionKind
  active: boolean
  boostCount?: number
  bookmarkCount?: number
  repostCount?: number
}

export type WsPostsSubscribedPayload = {
  postIds: string[]
}

export type WsPostsLiveUpdatedPayload = {
  postId: string
  version: string
  reason: string
  patch: Partial<{
    body: string
    editedAt: string | null
    editCount: number
    deletedAt: string | null
    commentCount: number
    viewerCount: number
    boostCount: number
    bookmarkCount: number
    repostCount: number
    poll: PostPoll | null
  }>
}

export type WsArticlesLiveUpdatedPayload = {
  articleId: string
  version: string
  reason: string
  patch: Partial<{
    commentCount: number
    viewCount: number
    boostCount: number
    reactions: ArticleReactionSummary[]
  }>
}

export type WsArticlesCommentAddedPayload = {
  articleId: string
  comment: ArticleComment
}

export type WsArticlesCommentDeletedPayload = {
  articleId: string
  commentId: string
  parentId: string | null
}

export type WsArticlesCommentUpdatedPayload = {
  articleId: string
  comment: ArticleComment
}

export type WsArticlesCommentReactionChangedPayload = {
  articleId: string
  commentId: string
  parentId: string | null
  reactions: ArticleReactionSummary[]
}

export type WsPostsCommentAddedPayload = {
  parentPostId: string
  comment: FeedPost
}

export type WsPostsCommentDeletedPayload = {
  parentPostId: string
  commentId: string
}

/**
 * Live "someone is replying to this post" indicator.
 * Emitted to `post:{postId}` room subscribers (excluding the sender) while a user is composing a reply.
 *
 * `status` is only set by server-side emitters (e.g. Marvin):
 *   - `'thinking'` — AI is processing (renders purple "thinking" label in AppTypingIndicator)
 *   - `'replying'` — about to post the reply (standard wave animation)
 */
export type WsPostsTypingPayload = {
  postId: string
  user: {
    id: string
    username: string | null
    verifiedStatus: string | null
    premium: boolean
    premiumPlus: boolean
    isOrganization: boolean
  }
  typing: boolean
  status?: 'thinking' | 'replying'
}

/** New top-level post from someone the viewer follows; pushed to each follower's user room. */
export type WsFeedNewPostPayload = {
  post: FeedPost
}

/** New top-level post (or repost) in a community group; pushed to the `group:{id}` room. */
export type WsGroupNewPostPayload = {
  groupId: string
  post: FeedPost
}

export type WsGroupMarvChangedPayload = {
  groupId: string
  isMember: boolean
}

/**
 * Live "someone in your circle just answered today's check-in" event.
 * Emitted to followers + crew members of the actor when a `kind: 'checkin'` post is created.
 */
export type WsCheckinAnsweredTodayPayload = {
  dayKey: string
  totalToday: number
  answerer: {
    id: string
    username: string | null
    displayName: string | null
    avatarUrl: string | null
    isFollowed?: boolean
  }
}

export type WsAdminUpdateKind = 'reports' | 'verification' | 'feedback'
export type WsAdminUpdateAction = 'created' | 'updated' | 'deleted' | 'resolved' | 'reviewed' | 'other'
export type WsAdminUpdatedPayload = {
  kind: WsAdminUpdateKind
  action: WsAdminUpdateAction
  id?: string
}

export type WsUsersSelfUpdatedPayload = {
  user: PublicProfile
}

/** Emitted to subscribers of a user when that user joins or leaves a space. */
export type WsUsersSpaceChangedPayload = {
  userId: string
  spaceId: string | null
  previousSpaceId?: string
}

export type WsPresenceStatusUpdatedPayload = {
  status: UserStatus
}

export type WsPresenceStatusClearedPayload = {
  userId: string
}

export type WsPresencePlatformsChangedPayload = {
  userId: string
  platforms: string[]
}

// Canonical self-only auth/settings snapshot (matches API `/auth/me` user DTO).
export type UserDto = {
  id: string
  createdAt: string
  phone: string
  email: string | null
  emailVerifiedAt: string | null
  emailVerificationRequestedAt: string | null
  username: string | null
  usernameIsSet: boolean
  name: string | null
  bio: string | null
  website: string | null
  xUsername: string | null
  pickaxUsername: string | null
  locationInput: string | null
  locationDisplay: string | null
  locationZip: string | null
  locationCity: string | null
  locationCounty: string | null
  locationState: string | null
  locationCountry: string | null
  locationPromptSkipped: boolean
  birthdate: string | null
  interests: string[]
  menOnlyConfirmed: boolean
  siteAdmin: boolean
  featureToggles: string[]
  bannedAt: string | null
  bannedReason: string | null
  bannedByAdminId: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  stewardBadgeEnabled: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  verifiedAt: string | null
  unverifiedAt: string | null
  followVisibility: 'all' | 'verified' | 'premium' | 'none'
  birthdayVisibility: 'none' | 'monthDay' | 'full'
  avatarUrl: string | null
  bannerUrl: string | null
  pinnedPostId: string | null
  coins: number
  checkinStreakDays: number
  lastCheckinDayKey: string | null
  longestStreakDays: number
  /** True when the user has opted in to the crew-discovery directory. */
  openToCrew: boolean
  /** Included by /auth/me bootstrap response for fast badge hydration. */
  notificationUndeliveredCount?: number
  /** Included by /auth/me bootstrap response for fast badge hydration. */
  messageUnreadCounts?: {
    primary: number
    requests: number
  }
  /** Included by /auth/me bootstrap response for fast badge hydration. */
  notificationUnreadCommentCount?: number
  /** Included by /auth/me bootstrap response for fast badge hydration. */
  groupsUnread?: {
    total: number
    byGroupId: Record<string, number>
  }
  /** Included by /auth/me bootstrap response for fast badge hydration. */
  crewInviteInboxCount?: number
  /** Canonical authored-content totals returned by /auth/me. */
  postCount?: number | null
  articleCount?: number | null
  /**
   * Non-null only while a site admin is impersonating this user ("log in as user").
   * Describes the admin really driving the session.
   */
  impersonation?: Impersonation | null
}

/** Mirrors `ImpersonationDto` in menofhunger-api/src/common/dto/auth.dto.ts. */
export type Impersonation = {
  adminUserId: string
  adminUsername: string | null
  adminName: string | null
  adminAvatarUrl: string | null
}

export type WsUsersMeUpdatedPayload = {
  user?: UserDto
  reason?: string
}

export type AdminUserSensitiveFields = {
  phone: string
  email: string | null
  birthdate: string | null
}

export type AdminUserDetailData = UserDto & {
  orgAffiliations: OrgAffiliation[]
  sensitive: AdminUserSensitiveFields
  canRevealSensitive: boolean
}

export type AdminUserRecentPost = {
  id: string
  createdAt: string
  body: string
  parentId: string | null
  rootId: string | null
  kind: string
  visibility: string
  commentCount: number
  boostCount: number
  bookmarkCount: number
}

export type AdminUserRecentArticle = {
  id: string
  title: string
  slug: string
  excerpt: string | null
  createdAt: string
  publishedAt: string | null
  isDraft: boolean
  visibility: string
  viewCount: number
  boostCount: number
  commentCount: number
}

export type AdminUserRecentSearch = {
  id: string
  query: string
  createdAt: string
}

export type AdminAdjustCoinsResult = {
  transferId: string
  targetUserId: string
  delta: number
  targetBalanceAfter: number
}

// --- Daily check-ins ---

export type CheckinAllowedVisibility = 'verifiedOnly' | 'premiumOnly'

export type CheckinCrewMemberStatus = {
  userId: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  answeredToday: boolean
  isViewer: boolean
}

export type CheckinCrewBlock = {
  id: string
  slug: string
  name: string | null
  promptFraming: 'crew'
  currentStreakDays: number
  longestStreakDays: number
  lastCompletedDayKey: string | null
  memberStatus: CheckinCrewMemberStatus[]
}

export type GetCheckinsTodayResponse = {
  dayKey: string
  prompt: string
  hasCheckedInToday: boolean
  coins: number
  checkinStreakDays: number
  allowedVisibilities: CheckinAllowedVisibility[]
  crew?: CheckinCrewBlock | null
  socialProof?: GetCheckinsTodayAnsweredResponse | null
}

export type CheckinAnswerer = {
  id: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
  answeredAt: string
  isFollowed?: boolean
}

export type GetCheckinsTodayAnsweredResponse = {
  dayKey: string
  totalToday: number
  recentAnswerers: CheckinAnswerer[]
}

export type CreateCheckinResponse = {
  post: FeedPost
  checkin: { dayKey: string; prompt: string }
  coinsAwarded: number
  bonusCoinsAwarded: number
  checkinStreakDays: number
}

export type LeaderboardUser = {
  id: string
  username: string | null
  name: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  stewardBadgeEnabled: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl: string | null
  checkinStreakDays: number
  longestStreakDays: number
  /** Only present on weekly-scope responses. */
  daysThisWeek?: number
}

export type LeaderboardViewerRank = {
  rank: number
  user: LeaderboardUser
}

export type GetCheckinsLeaderboardResponse = {
  users: LeaderboardUser[]
  viewerRank: LeaderboardViewerRank | null
  /** ISO timestamp; only present on weekly-scope responses. */
  weekStart?: string
  generatedAt: string
}

// --- Admin analytics ---

export type AnalyticsRange = '7d' | '30d' | '3m' | '1y' | 'all'
export type AnalyticsGranularity = 'day' | 'week' | 'month'

export type AdminAnalyticsTimeSeriesPoint = {
  bucket: string
  count: number
}

export type AdminAnalyticsSummary = {
  totalUsers: number
  verifiedUsers: number
  /** All-time public, regular, non-draft, non-deleted posts. */
  totalPublicPosts: number
  premiumUsers: number
  premiumPlusUsers: number
  /** Users with at least one active (non-revoked, non-expired) subscription grant */
  usersWithActiveGrants: number
  dau: number
  mau: number
  /** Sum of all user coin balances — total coins in the economy */
  totalCoinsInEconomy: number
}

export type AdminAnalyticsTopPost = {
  id: string
  bodyPreview: string
  authorUsername: string
  viewCount: number
  boostCount: number
  commentCount: number
  reactionCount: number
  createdAt: string
}

export type AdminAnalyticsRetentionRow = {
  cohortWeek: string
  size: number
  w1: number
  w4: number
}

export type AdminAnalyticsEngagement = {
  d30CohortSize: number
  d30RetainedCount: number
  d30RetentionPct: number | null
  activationEligibleCount: number
  activationCount: number
  activationPct: number | null
  creatorMauCount: number
  creatorCount: number
  creatorPct: number | null
  avgFollowersPerUser: number
  connectedUserCount: number
  connectedUserPct: number | null
}

export type AdminAnalyticsMonetization = {
  free: number
  payingPremium: number
  payingPremiumPlus: number
  compedPremium: number
  compedPremiumPlus: number
  byStatus: Record<string, number>
}

export type AdminAnalyticsCoins = {
  /** Sum of all user coin balances (all time, all non-banned users). */
  totalInEconomy: number
  /** Coins minted from streak rewards in the selected range. */
  mintedInRange: number
  /** Coins sent peer-to-peer in the selected range. */
  transferredInRange: number
  /** Distinct users who earned streak coins in the selected range. */
  uniqueEarnersInRange: number
  /** Distinct users who sent coins to others in the selected range. */
  uniqueSendersInRange: number
  /** Coins minted per time bucket in the selected range. */
  minted: AdminAnalyticsTimeSeriesPoint[]
  /** Coins minted grouped by multiplier amount (1, 2, 3, 4). */
  mintedByMultiplier: Record<string, number>
  /** transferred / minted in range. Null when minted = 0. */
  velocityRatio: number | null
  /** Gini coefficient (0 = equal, 1 = all coins held by one person). Null when no holders. */
  giniCoefficient: number | null
}

export type AdminAnalyticsTopArticle = {
  id: string
  title: string
  slug: string
  visibility: string
  authorUsername: string
  viewCount: number
  boostCount: number
  commentCount: number
  reactionCount: number
  publishedAt: string
}

export type AdminAnalyticsArticleKpi = {
  totalPublished: number
  totalDrafts: number
  uniqueAuthors: number
  totalViewsInRange: number
  totalBoostsInRange: number
  totalReactionsInRange: number
  totalCommentsInRange: number
  avgViewsPerArticle: number
}

export type AdminAnalyticsArticles = {
  kpis: AdminAnalyticsArticleKpi
  published: AdminAnalyticsTimeSeriesPoint[]
  views: AdminAnalyticsTimeSeriesPoint[]
  byVisibility: Record<string, number>
  topArticles: AdminAnalyticsTopArticle[]
}

export type AdminAnalyticsGroupsTopRow = {
  id: string
  slug: string
  name: string
  memberCount: number
  rootPostsInRange: number
  replyRate24hPct: number | null
}

export type AdminAnalyticsGroups = {
  usersInAnyGroup: number
  pctUsersInAnyGroup: number | null
  activeGroups: number
  newActiveMembershipsInRange: number
  pendingApprovals: number
  groupRootPostsInRange: number
  groupRepliesInRange: number
  pctGroupRootsWithReplyWithin24h: number | null
  topGroups: AdminAnalyticsGroupsTopRow[]
}

export type AdminAnalyticsSpacesTopRow = {
  id: string
  ownerId: string
  ownerUsername: string
  title: string
  mode: string
  isActive: boolean
  createdAt: string
  activatedAt: string | null
}

export type AdminAnalyticsSpaces = {
  /** All-time total spaces. */
  totalSpaces: number
  /** Spaces currently marked isActive = true. */
  activeSpaces: number
  /** Spaces created within the selected range. */
  spacesCreatedInRange: number
  /** Spaces whose last go-live falls in the selected range. */
  wentLiveInRange: number
  /** Currently scheduled (upcoming) and not live. */
  scheduledSpaces: number
  /** Notify-me subscribers excluding hosts, all time. */
  notifyMeSubscribers: number
  /** Notify-me subscribers (excluding hosts) created in the selected range. */
  notifyMeSubscribersInRange: number
  /** All-time spaces by current mode (NONE / WATCH_PARTY / RADIO). */
  byMode: Record<string, number>
  /** Time series — spaces created per bucket in the selected range. */
  created: AdminAnalyticsTimeSeriesPoint[]
  /** Currently active spaces, most recently updated first. */
  topSpaces: AdminAnalyticsSpacesTopRow[]
}

export type AdminAnalyticsAI = {
  /** All MarvinUsageEvent rows in range (success + errors). */
  totalInteractionsInRange: number
  /** Rows where errorCode IS NULL (actual AI responses delivered). */
  successfulInteractionsInRange: number
  /** Distinct users who triggered Marv in range. */
  uniqueUsersInRange: number
  /** Sum of creditsSpent for all events in range. */
  creditsSpentInRange: number
  /** Sum of estimatedCostUsd in range; null when no cost data yet. */
  estimatedCostUsdInRange: number | null
  /** Average latencyMs for successful events; null when no data. */
  avgLatencyMsInRange: number | null
  /** Count by MarvinSource: "public_thread" | "private_session" | "catch_up". */
  bySource: Record<string, number>
  /** Count by effectiveMode for successful events: "fast" | "regular" | "smart". */
  byEffectiveMode: Record<string, number>
  /** Count by outcome for all events: "success" | errorCode string. */
  byOutcome: Record<string, number>
  /** Time series of successful interactions per granularity bucket. */
  interactions: AdminAnalyticsTimeSeriesPoint[]
}

export type AdminAnalytics = {
  range: AnalyticsRange
  granularity: AnalyticsGranularity
  summary: AdminAnalyticsSummary
  signups: AdminAnalyticsTimeSeriesPoint[]
  /** Top public regular posts by all-time denormalized view count. */
  topPostsAllTime: AdminAnalyticsTopPost[]
  postsByVisibility: Record<string, number>
  /** Time series of regular posts by human (non-bot) users. */
  posts: AdminAnalyticsTimeSeriesPoint[]
  /** Time series of regular posts by AI/bot users. */
  aiPosts: AdminAnalyticsTimeSeriesPoint[]
  checkins: AdminAnalyticsTimeSeriesPoint[]
  /** Time series of messages sent by human (non-bot) users. */
  messages: AdminAnalyticsTimeSeriesPoint[]
  /** Time series of messages sent by AI/bot users. */
  aiMessages: AdminAnalyticsTimeSeriesPoint[]
  follows: AdminAnalyticsTimeSeriesPoint[]
  retention: AdminAnalyticsRetentionRow[]
  engagement: AdminAnalyticsEngagement
  /**
   * All-time landing-eligible men/posts/views + authorship concentration.
   * Same filters as the public homepage stats (not range-filtered).
   */
  landing: LandingStats
  monetization: AdminAnalyticsMonetization
  coins: AdminAnalyticsCoins
  articles: AdminAnalyticsArticles
  groups: AdminAnalyticsGroups
  spaces: AdminAnalyticsSpaces
  ai: AdminAnalyticsAI
  asOf: string
}

/** Marv briefing of the already-loaded admin analytics snapshot. */
export type AdminAnalyticsBrief = Contracts.AdminAnalyticsBriefDto

export type LandingMenBreakdown = {
  /** premium OR premiumPlus. */
  premium: number
  /** verifiedStatus != 'none' AND NOT (premium OR premiumPlus). */
  verified: number
  /** premium + verified. */
  total: number
  /** Distinct verified men who authored ≥1 landing-eligible post or reply. */
  contributors: number
  /** Distinct verified men who authored ≥1 landing-eligible original (non-reply) post. */
  originalAuthors: number
  /** Integer percent 0–100 of eligible content by the single most prolific author. */
  topAuthorSharePercent: number
  /** Integer percent 0–100 of eligible content by the five most prolific authors. */
  top5SharePercent: number
  /** Median posts+replies among contributors only. */
  medianPostsPerContributor: number
}

export type LandingPostBreakdown = {
  /** visibility = 'public'. */
  public: number
  /** visibility = 'verifiedOnly'. */
  verified: number
  /** visibility = 'premiumOnly'. */
  premium: number
  /** Top-level posts (parentId IS NULL). */
  original: number
  /** Replies/comments (parentId IS NOT NULL). */
  replies: number
  /** public + verified + premium (onlyMe excluded). Equals original + replies. */
  total: number
}

/**
 * Site-wide unique views (person×post), matching per-post viewerCount semantics.
 * Guests are derived as total − authenticated tier counts.
 */
export type LandingViewsBreakdown = {
  premium: number
  verified: number
  unverified: number
  guest: number
  total: number
}

/** Published articles by landing-eligible authors (drafts/deleted/onlyMe excluded). */
export type LandingArticleBreakdown = {
  public: number
  verified: number
  premium: number
  total: number
  authors: number
  /** Sum of Article.viewCount (unique person×article). */
  views: number
}

export type LandingStats = {
  men: LandingMenBreakdown
  posts: LandingPostBreakdown
  articles: LandingArticleBreakdown
  views: LandingViewsBreakdown
}

export type LandingTopPost = FeedPost & {
  /** Distinct logged-in/anonymous viewers active on this post in the last 7 days. */
  weeklyViewCount: number
}

export type LandingUser = Omit<FollowListUser, 'relationship'> & {
  relationship?: FollowRelationship
}

export type LandingSnapshot = {
  stats: LandingStats
  recentlyActiveMen: LandingUser[]
  topPostsThisWeek: LandingTopPost[]
  trendingArticles: Article[]
  asOf: string
}

/** Community group shell (public to signed-in users). */
export type CommunityGroupShell = {
  id: string
  slug: string
  name: string
  description: string
  rules: string | null
  coverImageUrl: string | null
  avatarImageUrl: string | null
  joinPolicy: 'open' | 'approval'
  memberCount: number
  isFeatured: boolean
  featuredOrder: number
  createdAt: string
  viewerMembership: { status: 'active' | 'pending'; role: 'owner' | 'moderator' | 'member' } | null
  viewerPendingApproval: boolean
  /** Number of pending join requests. Only populated for owners and moderators of approval-policy groups. */
  pendingMemberCount?: number
  /** Number of pending outbound invites the group still has open. Only populated for owners and moderators. */
  pendingInviteCount?: number
  /** Marv bot membership status. Only populated on getShellBySlug; null when Marv is not configured. */
  marv?: { userId: string; username: string | null; isMember: boolean } | null
  /** ISO timestamp of the viewer's most recent post/reply in this group. Only populated on listMine. */
  lastViewerPostAt?: string | null
}

export type CommunityGroupMemberListItem = {
  userId: string
  username: string | null
  name: string | null
  role: 'owner' | 'moderator' | 'member'
  avatarUrl: string | null
  joinedAt: string
}

export type CommunityGroupPendingMember = {
  userId: string
  username: string | null
  name: string | null
  requestedAt: string
}

// ─── Community group invites ─────────────────────────────────────────────────

export type CommunityGroupInviteStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'expired'

/** Lightweight group ref returned with each invite (for inbox row rendering). */
export type CommunityGroupInviteGroupRef = {
  id: string
  slug: string
  name: string
  descriptionPreview: string
  avatarImageUrl: string | null
  coverImageUrl: string | null
  joinPolicy: 'open' | 'approval'
  memberCount: number
}

export type CommunityGroupInvite = {
  id: string
  createdAt: string
  updatedAt: string
  expiresAt: string
  status: CommunityGroupInviteStatus
  message: string | null
  /** ISO; only set when the invitee previously declined this same row. */
  lastDeclinedAt: string | null
  group: CommunityGroupInviteGroupRef
  /** List-user without viewer relationship (the API doesn't compute it for invites). */
  invitedBy: Omit<FollowListUser, 'relationship'> & { relationship?: FollowRelationship }
  invitee: Omit<FollowListUser, 'relationship'> & { relationship?: FollowRelationship }
}

/**
 * Annotation returned by `/groups/:groupId/invitable-users` so the picker can
 * render hints like "Already a member" or "Declined — try again on Mar 14".
 */
export type CommunityGroupInvitableUserStatus =
  | { kind: 'invitable' }
  | { kind: 'self' }
  | { kind: 'banned' }
  | { kind: 'member'; role: 'owner' | 'moderator' | 'member' }
  | { kind: 'pending_join_request' }
  | { kind: 'pending_invite'; inviteId: string; lastNotifiedAt: string | null }
  | { kind: 'declined_cooldown'; inviteId: string; declinedAt: string; canReinviteAt: string }
  | { kind: 'declined_invitable'; inviteId: string; declinedAt: string }

export type CommunityGroupInvitableUser = {
  user: FollowListUser
  inviteStatus: CommunityGroupInvitableUserStatus
}

// ─── Articles ────────────────────────────────────────────────────────────────

export type ArticleReactionSummary = {
  reactionId: string
  emoji: string
  count: number
  viewerHasReacted: boolean
}

export type ArticleAuthor = {
  id: string
  username: string | null
  name: string | null
  bio: string | null
  /** Override bio for article author sections. Falls back to `bio` if null. */
  articleBio: string | null
  avatarUrl: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  stewardBadgeEnabled: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  orgAffiliations: OrgAffiliation[]
}

export type ArticleTag = {
  /** Normalized slug — safe for URL params (e.g. "stoicism"). */
  tag: string
  /** Display label as the author typed it (e.g. "Stoicism"). */
  label: string
}

/** User-selected taxonomy preferences for digest personalization. */
export type TaxonomyPreference = {
  termId: string
  slug: string
  label: string
  kind: TaxonomyKind
}

/** Backwards-compat alias while migration completes. */
export type ArticleTagPreference = TaxonomyPreference

export type Article = {
  id: string
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  editedAt: string | null
  deletedAt: string | null
  title: string
  slug: string
  /** Tiptap JSON document as stringified JSON. */
  body: string
  excerpt: string | null
  thumbnailUrl: string | null
  /** R2 key for the thumbnail (used by the editor to track pending changes). */
  thumbnailR2Key?: string | null
  visibility: PostVisibility
  isDraft: boolean
  lastSavedAt: string
  boostCount: number
  commentCount: number
  viewCount: number
  author: ArticleAuthor
  reactions: ArticleReactionSummary[]
  tags: ArticleTag[]
  readingTimeMinutes?: number
  viewerHasBoosted?: boolean
  /** False when the viewer's tier does not grant access; body/excerpt are stripped in this case. */
  viewerCanAccess?: boolean
}

export type ArticleSharePreview = {
  id: string
  title: string
  excerpt: string | null
  thumbnailUrl: string | null
  visibility: PostVisibility
  publishedAt: string | null
  author: Pick<ArticleAuthor, 'id' | 'username' | 'name' | 'avatarUrl' | 'verifiedStatus' | 'premium' | 'premiumPlus'>
  /** Present when the preview comes from /articles/:id; false means media should be blurred/locked. */
  viewerCanAccess?: boolean
}

// ─── Fitness types ────────────────────────────────────────────────────────────

export type FitnessProvider = 'strava' | 'apple_health'
export type FitnessActivityType = 'run' | 'ride' | 'walk' | 'swim' | 'workout' | 'hike' | 'yoga' | 'other'
export type FitnessUnits = 'us' | 'metric'
export type FitnessShareType = 'activity' | 'weight' | 'progress'

export type FitnessConnection = {
  provider: FitnessProvider
  status: string
  lastSyncAt: string | null
  lastManualSyncAt: string | null
  providerUserId: string | null
}

export type FitnessActivity = {
  id: string
  provider: FitnessProvider
  activityType: FitnessActivityType
  startedAt: string
  endedAt: string | null
  durationSec: number
  distanceM: number | null
  effortScore: number | null
  stepsCount: number | null
  calories: number | null
  avgHeartrate: number | null
  maxHeartrate: number | null
  /** Total elevation gain in meters. Populated for Strava; null for Apple Health. */
  totalElevationM: number | null
}

export type FitnessDailySummary = {
  dayKey: string
  stepsCount: number | null
  workoutMinutes: number | null
  distanceM: number | null
  effortScore: number | null
  sleepMinutes?: number | null
  hrvMs?: number | null
}

export type FitnessBodyMetric = {
  id: string
  /** "weight" | "vo2max" */
  kind: string
  /** kg for weight; ml/kg/min for vo2max */
  weightKg: number
  measuredAt: string
  source: string
}

export type FitnessGoal = {
  id: string
  kind: string
  startKg: number | null
  targetKg: number | null
  startedAt: string
  completedAt: string | null
}

export type FitnessActivitySnapshot = {
  activityType: FitnessActivityType
  startedAt: string
  durationSec: number
  distanceM: number | null
  effortScore: number | null
  stepsCount: number | null
  calories: number | null
  avgHeartrate: number | null
  maxHeartrate: number | null
  totalElevationM: number | null
}

export type FitnessWeightSnapshot = {
  weightKg: number
  measuredAt: string
  previousWeightKg: number | null
  deltaKg: number | null
}

export type FitnessProgressSnapshot = {
  startKg: number | null
  currentKg: number | null
  targetKg: number | null
  startedAt: string
}

export type FitnessShareSnapshot =
  | { type: 'activity'; data: FitnessActivitySnapshot }
  | { type: 'weight'; data: FitnessWeightSnapshot }
  | { type: 'progress'; data: FitnessProgressSnapshot }

export type FitnessSharePreview = {
  id: string
  shareType: FitnessShareType
  snapshot: FitnessShareSnapshot
}

export type FitnessWeekSummary = {
  weekStart: string
  weekEnd: string
  totalSteps: number
  totalWorkoutMinutes: number
  totalDistanceM: number
  totalEffort: number
  activityCount: number
  days: FitnessDailySummary[]
}

export type FitnessPage = {
  connections: FitnessConnection[]
  weekSummary: FitnessWeekSummary
  recentActivities: FitnessActivity[]
  units: FitnessUnits
  /** True when the viewer has the 'fitnessStrava' feature toggle. */
  stravaEnabled: boolean
  latestWeight: FitnessBodyMetric | null
  weightHistory: FitnessBodyMetric[]
  latestVo2Max: FitnessBodyMetric | null
  vo2maxHistory: FitnessBodyMetric[]
  activeGoal: FitnessGoal | null
}

export type ArticleComment = {
  id: string
  createdAt: string
  editedAt: string | null
  deletedAt: string | null
  body: string
  articleId: string
  parentId: string | null
  replyCount: number
  author: ArticleAuthor
  reactions: ArticleReactionSummary[]
  replies?: ArticleComment[]
}


export type CoinTransferCounterparty = {
  userId: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

export type CoinTransferItem = {
  id: string
  createdAt: string
  amount: number
  note: string | null
  direction: 'sent' | 'received' | 'admin_added' | 'admin_removed' | 'streak_reward' | 'verification_gift'
  counterparty: CoinTransferCounterparty
}

export type CoinTransferReceiptParty = {
  userId: string
  username: string | null
  displayName: string | null
  avatarUrl: string | null
}

export type CoinTransferReceipt = {
  id: string
  createdAt: string
  amount: number
  note: string | null
  direction: 'sent' | 'received' | 'admin_added' | 'admin_removed' | 'streak_reward' | 'verification_gift'
  sender: CoinTransferReceiptParty
  recipient: CoinTransferReceiptParty
  counterparty: CoinTransferCounterparty
}

export type TransferCoinsRequest = {
  recipientUsername: string
  amount: number
  note?: string | null
}

export type TransferCoinsResponse = {
  transferId: string
  amount: number
  recipientUsername: string
  senderBalanceAfter: number
}

/** Response from GET /users/location-preview */
export type LocationPreviewResponse = {
  zip: string | null
  city: string | null
  state: string | null
  stateDisplay: string | null
  display: string | null
}

/** Response from GET /users/by-location */
export type LocationBrowseSection = {
  key: string
  label: string
  users: FollowListUser[]
}

export type LocationBrowseResponse = {
  location: {
    zip?: string
    city?: string
    county?: string
    state: string
    stateDisplay?: string
  }
  memberCount?: number
  sections: LocationBrowseSection[]
}

// ─── Crews ───────────────────────────────────────────────────────────────────

export type CrewMemberRole = 'owner' | 'member'

export type CrewInviteStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'expired'

export type CrewMemberListItem = {
  user: CrewUserSummary
  role: CrewMemberRole
  joinedAt: string
  isDesignatedSuccessor: boolean
}

/** Shared user summary used by crew DTOs (matches the API UserListDto shape). */
export type CrewUserSummary = Omit<FollowListUser, 'relationship' | 'orgAffiliations'> & {
  orgAffiliations?: OrgAffiliation[]
}

export type CrewPublic = {
  id: string
  slug: string
  /** null means "Untitled Crew". Renderers should show the friendly fallback. */
  name: string | null
  tagline: string | null
  bio: string | null
  avatarUrl: string | null
  coverUrl: string | null
  memberCount: number
  createdAt: string
  owner: CrewUserSummary
  members: CrewMemberListItem[]
}

export type CrewPrivate = CrewPublic & {
  wallConversationId: string
  designatedSuccessorUserId: string | null
  viewerRole: CrewMemberRole
  pendingInviteCount: number
}

export type CrewInvite = {
  id: string
  createdAt: string
  expiresAt: string
  status: CrewInviteStatus
  message: string | null
  crew: CrewPublic | null
  invitedBy: CrewUserSummary
  invitee: CrewUserSummary
}

/**
 * Viewer-specific membership info attached to GET /crew/by-slug responses.
 * Populated only when the viewer is an active member of the resolved crew.
 * Lets the public page render member-only surfaces (the chat button + unread
 * badge, owner controls) without an extra round-trip to /crew/me.
 */
export type CrewBySlugViewerMembership = {
  role: CrewMemberRole
  wallConversationId: string
  designatedSuccessorUserId: string | null
  /** Unread message count for the crew chat (the wall conversation). */
  unreadChatCount: number
}

export type CrewBySlugResponse = {
  crew: CrewPublic
  redirectedFromSlug: string | null
  viewerMembership: CrewBySlugViewerMembership | null
}

/** An entry in the open-to-crew discovery directory. */
export type OpenCrewMember = {
  user: CrewUserSummary
  sharedInterests: string[]
}

// ─── Marv (AI helper) ────────────────────────────────────────────────────────

/** User-facing reply-mode tier; mirrors the API's `MarvinMode` enum. */
export type MarvinModeDto = 'auto' | 'fast' | 'regular' | 'smart'
/** Source channel; mirrors the API's `MarvinSource` enum. */
export type MarvinSourceDto = 'public_thread' | 'private_session' | 'catch_up'

/** Snapshot of the requester's Marv credit bucket. Returned by `GET /marvin/me`. */
export type MarvinCreditSummaryDto = {
  credits: number
  maxCredits: number
  creditsPerDay: number
  /** ISO timestamp. */
  lastRefilledAt: string
}

/** Per-mode credit costs, sourced from server config. Used to preview spend before "Catch me up". */
export type MarvinCostsDto = {
  fast: number
  regular: number
  smart: number
  /** Extra credits charged per web-search call the model makes. */
  webSearchSurcharge: number
  /** Extra credits charged per image passed to a vision-capable model. */
  visionPerImage: number
  /** Extra credits charged per URL the model fetches. */
  urlFetchSurcharge: number
}

/** `GET /marvin/me` response body. Used by chat page + settings + composer mode pill. */
export type MarvinMeDto = {
  enabled: boolean
  isPremium: boolean
  preferredMode: MarvinModeDto
  credits: MarvinCreditSummaryDto
  /** Per-mode base costs + surcharges, for cost-preview UI. */
  costs: MarvinCostsDto
  marv: {
    userId: string
    username: string
    displayName: string
    avatarUrl: string | null
  } | null
}

/** Body for `PATCH /marvin/me/preferences`. */
export type MarvinUpdatePreferencesBodyDto = {
  preferredMode?: MarvinModeDto
}

/** `GET /marvin/me/context-card` — what Marv knows about the viewer (or null if not generated). */
export type MarvinContextCardDto = {
  cardText: string
  /** "generated" | "manual" | "hybrid" */
  source: string
  /** ISO timestamp. */
  updatedAt: string
}

/** A single Marv interaction event (success, canned, or failure). */
export type MarvinUsageEventDto = {
  id: string
  userId: string
  source: MarvinSourceDto
  sourceId: string
  rootPostId: string | null
  requestedMode: MarvinModeDto
  effectiveMode: MarvinModeDto
  creditsSpent: number
  inputTokens: number | null
  outputTokens: number | null
  cachedInputTokens: number | null
  modelUsed: string | null
  estimatedCostUsd: number | null
  responseId: string | null
  routingReason: string | null
  errorCode: string | null
  latencyMs: number | null
  /** ISO timestamp. */
  createdAt: string
}

/** Realtime payload for `marv:credits-updated`. Same shape as `MarvinCreditSummaryDto`. */
export type MarvCreditsUpdatedPayloadDto = MarvinCreditSummaryDto

/** Body for `POST /marvin/catch-up/:postId`. */
export type MarvinCatchUpBodyDto = {
  mode?: MarvinModeDto
  /** Skip the cache and regenerate a fresh summary (the "Regenerate" button). Spends credits. */
  refresh?: boolean
  /**
   * Peek mode: return the cached summary if one exists, else `null`. Never spends credits or
   * calls the model. Used to decide whether the modal can show a free summary on open.
   */
  cacheOnly?: boolean
  /**
   * When true (default), pass images from the thread to vision-capable models.
   * When false, skip vision — no images attached, no vision surcharge, cheaper.
   */
  includeImages?: boolean
}

/**
 * Result of a "Catch me up" request — an AI summary of the conversation above AND
 * below a focal post. Returned by `POST /marvin/catch-up/:postId`.
 */
export type MarvinCatchUpDto = {
  postId: string
  rootPostId: string | null
  /** The generated summary text (markers stripped; always present). */
  summary: string
  /**
   * Structured sections when the thread has replies and the model followed the format.
   * `post` summarises the focal post; `replies` synthesises the replies below.
   * `since` is present only when this summary was generated over a thread the viewer had
   * already summarized — it's the delta, i.e. what changed since then, so lead with it.
   * Null when the AI returned a single-blob response (no markers found).
   */
  sections?: { post: string; replies: string | null; since?: string | null } | null
  /** The model tier that actually ran (after routing/auto-upgrades). */
  effectiveMode: MarvinModeDto
  /** Credits spent on this request (0 on a cache hit). */
  creditsSpent: number
  /**
   * Breakdown of what drove the total spend (all 0 on a cache hit).
   * Lets the UI render e.g. "5 credits: 2 model + 2 image + 1 web search".
   */
  costBreakdown: {
    mode: number
    vision: number
    webSearch: number
    urlFetch: number
  }
  /** True when this summary was served from cache (no new credits spent). */
  cached: boolean
  /**
   * True when the thread changed after this summary was generated. The summary is still
   * served for free — show it immediately and label it, so regenerating is an informed
   * choice rather than a paywall. Always false on a freshly generated summary.
   */
  stale: boolean
  /**
   * Replies added since this summary was generated. 0 when fresh, and also 0 when `stale`
   * is true but only edits (no new replies) caused the drift.
   */
  newReplies: number
  /** How much of the thread the summary was built from. */
  included: {
    ancestors: number
    descendants: number
    /** Total descendants discovered within traversal depth (may exceed `descendants`). */
    totalDescendants: number
  }
  /** ISO timestamp of when the underlying summary was generated. */
  generatedAt: string
}

// Admin-only Marv types — used by `pages/admin/marv.vue`. Mirror what the
// API's `MarvinAdminService` returns; keep field names identical so we can
// pass rows straight through without re-shaping.

export type MarvAdminGlobalSettingsDto = {
  enabled: boolean
  fastCost: number | null
  regularCost: number | null
  smartCost: number | null
  fastModel: string | null
  regularModel: string | null
  smartModel: string | null
  /** ISO timestamp. */
  updatedAt: string
}

export type MarvAdminGlobalSettingsPatchDto = Partial<{
  enabled: boolean
  fastCost: number | null
  regularCost: number | null
  smartCost: number | null
  fastModel: string | null
  regularModel: string | null
  smartModel: string | null
}>

export type MarvAdminUserRowDto = {
  userId: string
  username: string | null
  displayName: string | null
  premium: boolean
  premiumPlus: boolean
  isBot: boolean
  credits: number
  /** ISO timestamp or null. */
  creditsLastRefilledAt: string | null
  preferredMode: MarvinModeDto
  disabledByAdmin: boolean
  totalCreditsSpent30d: number
  totalEvents30d: number
}

export type MarvAdminUserPatchDto = Partial<{
  credits: number
  disabled: boolean
}>

export type MarvAdminUserPatchResponseDto = {
  credits?: MarvinCreditSummaryDto
  disabledByAdmin?: boolean
}

export type MarvAdminContextCardDto = {
  cardText: string | null
  source: string | null
  /** ISO timestamp or null. */
  updatedAt: string | null
}

export type MarvAdminDailyCostRowDto = {
  /** YYYY-MM-DD UTC. */
  dayKey: string
  totalRequests: number
  totalCreditsSpent: number
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
}

// ─── Explore aggregate ───────────────────────────────────────────────────────

/** Minimal user shape returned on a recent search entry. */
export type RecentSearchUser = {
  id: string
  username: string | null
  name: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  stewardBadgeEnabled: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl: string | null
  orgAffiliations?: OrgAffiliation[]
  relationship?: FollowRelationship
}

/** Minimal group info on a recent search entry (group tap). */
export type RecentSearchGroup = {
  id: string
  slug: string
  name: string
  avatarImageUrl: string | null
  memberCount: number
}

/** Recent search entry from GET /search/recent. */
export type RecentSearch = {
  id: string
  query: string
  createdAt: string
  /** Populated when this entry was a profile tap rather than a typed query. */
  user: RecentSearchUser | null
  /** Populated when this entry was a group tap rather than a typed query. */
  group: RecentSearchGroup | null
}

/** Data for GET /search/recent. */
export type GetRecentSearchesData = RecentSearch[]

/** Aggregate response from GET /explore. */
export type GetExploreData = {
  /** Featured posts (always present). */
  featured: FeedPost[]
  featuredNextCursor?: string | null
  /** Topic categories (always). */
  categories: TopicCategory[]
  /** Trending articles (always). */
  trendingArticles: Article[]
  /** Explore-spotlight groups (always). */
  groups: { data: CommunityGroupShell[]; pagination?: { nextCursor: string | null } }
  /** Trending hashtags (always). */
  trendingHashtags: Array<{ value: string; label: string; usageCount: number }>
  /** Top users by follower count — always included for "People on MoH" carousel. */
  topUsers: FollowListUser[]
  /** Count of currently-online users (approximate). */
  onlineCount: number
  // ─── Authenticated-only (null when not signed in) ───────────────────────
  followedTopics: Topic[] | null
  recommendations: FollowListUser[] | null
  newestUsers: FollowListUser[] | null
  checkin: CheckinTodayState | null
}

/** Response from POST /auth/account/delete. */
export type DeleteAccountResponse = { success: true; deletionScheduledAt: string }

// ─── Scheduled Posts ─────────────────────────────────────────────────────────

export type ScheduledCommunityGroup = Contracts.ScheduledCommunityGroupDto

export type ScheduledPost = Contracts.ScheduledPostDto

export type ScheduledPostListResponse = ApiEnvelope<ScheduledPost[]> & {
  pagination: { nextCursor: string | null }
}

export type ScheduledPostResponse = ApiEnvelope<ScheduledPost>

/** Realtime payload when a scheduled post fires. */
export type ScheduledPostPublishedPayload = Contracts.ScheduledPostPublishedPayloadDto

/** Realtime payload when a scheduled post fails to publish. */
export type ScheduledPostFailedPayload = Contracts.ScheduledPostFailedPayloadDto

/** Today's check-in state from GET /checkins/today and GET /explore (authed). */
export type CheckinTodayState = {
  dayKey: string
  prompt: string
  hasCheckedInToday: boolean
  coins: number
  checkinStreakDays: number
  allowedVisibilities: string[]
  crew?: unknown
  socialProof?: unknown
}

// ─── Scripture ───────────────────────────────────────────────────────────────

export type ScriptureVerse = {
  number: number
  text: string
}

export type ScriptureRef = {
  reference: string
  translation: string
  translationName: string
  verses: ScriptureVerse[]
  text: string
}

// ─── Admin site config / auto-verify ─────────────────────────────────────────

export type SiteConfigAutoVerifyRecruiterDto = Contracts.SiteConfigAutoVerifyRecruiterDto
export type SiteConfigDto = Contracts.SiteConfigDto
export type AutoVerifyPreviewUserDto = Contracts.AutoVerifyPreviewUserDto
export type AutoVerifyPreviewDto = Contracts.AutoVerifyPreviewDto
export type AutoVerifyApplyDto = Contracts.AutoVerifyApplyDto

// ─── Announcements / ads ─────────────────────────────────────────────────────

export type AnnouncementDismissMethod = Contracts.AnnouncementDismissMethod
export type AnnouncementStatus = Contracts.AnnouncementStatus
export type Announcement = Contracts.AnnouncementDto
export type AnnouncementStats = Contracts.AnnouncementStatsDto
export type AnnouncementAdmin = Contracts.AnnouncementAdminDto
