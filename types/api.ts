/** Success envelope: payload in `data`, optional cursor/counts in `pagination`. */
export type ApiEnvelope<T> = { data: T; pagination?: ApiPagination }

/** Minimal org account shown alongside affiliated users. */
export type OrgAffiliation = {
  id: string
  username: string | null
  name: string | null
  avatarUrl: string | null
}

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

export type BillingTier = 'premium' | 'premiumPlus'
export type SubscriptionGrantSource = 'admin' | 'referral'

export type ActiveSubscriptionGrant = {
  id: string
  tier: BillingTier
  source: SubscriptionGrantSource
  months: number
  startsAt: string
  endsAt: string
  reason: string | null
}


export type BillingMe = {
  premium: boolean
  premiumPlus: boolean
  verified: boolean
  subscriptionStatus: string | null
  cancelAtPeriodEnd: boolean
  /** When the current Stripe billing period ends (null if no active Stripe sub). */
  currentPeriodEnd: string | null
  /** Latest access expiry across Stripe + active grants. */
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
    verifiedStatus: 'none' | 'identity' | 'manual'
  } | null
  /** How many users this user has recruited. */
  recruitCount: number
  /** Whether the one-time referral bonus has been granted to this user. */
  referralBonusGranted: boolean
}

export type Recruit = {
  id: string
  username: string | null
  name: string | null
  avatarKey: string | null
  recruitedAt: string
  isPremium: boolean
  bonusGranted: boolean
}

export type ReferralMe = {
  referralCode: string | null
  recruiter: { username: string | null; name: string | null } | null
  recruitCount: number
  referralBonusGranted: boolean
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
  emailDigestDaily: boolean
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
  mode: 'NONE' | 'WATCH_PARTY' | 'RADIO'
  watchPartyUrl: string | null
  radioStreamUrl: string | null
  owner: SpaceOwner
  listenerCount: number
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

export type SpaceChatMessage =
  | {
      id: string
      spaceId: string
      kind: 'user'
      body: string
      media?: SpaceChatMediaItem[]
      createdAt: string
      sender: SpaceChatSender
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

export type Websters1828WordOfDay = {
  word: string
  dictionaryUrl: string
  definition: string | null
  definitionHtml: string | null
  sourceUrl: string
  fetchedAt: string
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
  websters1828RecheckedAt: string | null
}

export type AdminEmailSampleType = 'daily_digest' | 'weekly_digest' | 'new_notifications' | 'instant_high_signal' | 'streak_reminder'
export type AdminEmailSampleSendResult = {
  sent: boolean
  reason: string | null
  type: AdminEmailSampleType
}

export type FeedbackCategory = 'bug' | 'feature' | 'account' | 'other'
export type FeedbackStatus = 'new' | 'triaged' | 'resolved'

export type ReportTargetType = 'post' | 'user'
export type ReportReason = 'spam' | 'harassment' | 'hate' | 'sexual' | 'violence' | 'illegal' | 'other'
export type ReportStatus = 'pending' | 'dismissed' | 'actionTaken'

export type PostVisibility = 'public' | 'verifiedOnly' | 'premiumOnly' | 'onlyMe'

export type PostMediaKind = 'image' | 'gif' | 'video'
export type PostMediaSource = 'upload' | 'giphy'

export type PostMedia = {
  id: string
  kind: PostMediaKind
  source: PostMediaSource
  url: string
  mp4Url: string | null
  /** Video poster image URL (from thumbnailR2Key). */
  thumbnailUrl?: string | null
  width: number | null
  height: number | null
  /** Video duration in seconds. */
  durationSeconds?: number | null
  /** Optional alt text for accessibility. */
  alt: string | null
  deletedAt: string | null
}

export type PostPollOption = {
  id: string
  text: string
  imageUrl: string | null
  width: number | null
  height: number | null
  alt: string | null
  voteCount: number
  percent: number
}

export type PostPoll = {
  id: string
  endsAt: string
  ended: boolean
  totalVoteCount: number
  viewerHasVoted: boolean
  viewerVotedOptionId: string | null
  options: PostPollOption[]
}

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
  /** When true, author is banned; id/username/name/avatar are redacted. */
  authorBanned?: boolean
}

export type PostMention = {
  id: string
  username: string
  verifiedStatus?: 'none' | 'identity' | 'manual'
  premium?: boolean
  premiumPlus?: boolean
  isOrganization?: boolean
  stewardBadgeEnabled?: boolean
}

/** Public profile payload from GET /users/:username */
export type PublicProfile = {
  id: string
  createdAt: string
  username: string | null
  name: string | null
  bio: string | null
  website: string | null
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
  orgAffiliations?: OrgAffiliation[]
  /** True when the viewer has blocked this user. */
  viewerHasBlockedUser?: boolean
  /** True when this user has blocked the viewer. */
  userHasBlockedViewer?: boolean
  /** True when this user is an active member of any Crew. */
  inCrew?: boolean
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
  kind?: 'regular' | 'checkin' | 'repost' | 'articleShare'
  checkinDayKey?: string | null
  checkinPrompt?: string | null
  visibility: PostVisibility
  isDraft?: boolean
  topics?: string[]
  /** User-created hashtags parsed from body text (lowercase, without '#'). */
  hashtags?: string[]
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
  /** Set when a block exists between viewer and author. */
  viewerBlockStatus?: 'viewer_blocked' | 'viewer_blocked_by' | null
  /** For kind='repost': the original post being reshared. */
  repostedPost?: FeedPost
  /** For posts containing an embedded post link: the quoted post (preloaded). */
  quotedPost?: FeedPost
  /** For kind='articleShare': the shared article preview. */
  article?: ArticleSharePreview
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

export type AdminImageReviewListItem = {
  id: string
  r2Key: string
  kind: PostMediaKind | null
  lastModified: string
  publicUrl: string | null
  deletedAt: string | null
  belongsToSummary: 'post' | 'user' | 'orphan'
  postId: string | null
  authorUsername: string | null
  userId: string | null
  profileUsername: string | null
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

export type VerificationRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

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
  }
  references: {
    posts: Array<{
      postMediaId: string
      postId: string
      postCreatedAt: string
      postVisibility: PostVisibility
      author: { id: string; username: string | null }
      deletedAt: string | null
    }>
    users: Array<{
      id: string
      username: string | null
      name: string | null
      premium: boolean
      premiumPlus: boolean
      stewardBadgeEnabled: boolean
      verifiedStatus: 'none' | 'identity' | 'manual'
    }>
  }
}

export type AdminImageReviewDeleteResponse = {
  success: true
  alreadyDeleted?: boolean
  r2Deleted?: boolean
  error?: string
  postMediaCount?: number
  userCount?: number
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

export type FollowVisibility = 'all' | 'verified' | 'premium' | 'none'
export type BirthdayVisibility = 'none' | 'monthDay' | 'full'

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

export type OnlineUser = FollowListUser & { lastConnectAt?: number; idle?: boolean }

/** Data type for GET /presence/online (array); totalOnline in pagination. */
export type GetPresenceOnlineData = OnlineUser[]

export type RecentlyOnlineUser = FollowListUser & { lastOnlineAt: string | null }

/** Data type for GET /presence/recent (array); nextCursor in pagination. */
export type GetPresenceRecentData = RecentlyOnlineUser[]

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

export type NotificationKind =
  | 'comment'
  | 'boost'
  | 'repost'
  | 'follow'
  | 'followed_post'
  | 'followed_article'
  | 'mention'
  | 'nudge'
  | 'poll_results_ready'
  | 'generic'
  | 'coin_transfer'
  | 'group_join_request'
  | 'crew_invite_received'
  | 'crew_invite_accepted'
  | 'crew_invite_declined'
  | 'crew_invite_cancelled'
  | 'crew_member_joined'
  | 'crew_member_left'
  | 'crew_member_kicked'
  | 'crew_owner_transferred'
  | 'crew_owner_transfer_vote'
  | 'crew_wall_mention'
  | 'crew_disbanded'

export type NotificationGroupKind = 'comment' | 'boost' | 'repost' | 'follow' | 'followed_post' | 'nudge'

export type NotificationActor = {
  id: string
  username: string | null
  name: string | null
  avatarUrl: string | null
  premium?: boolean
  isOrganization?: boolean
  verifiedStatus?: 'none' | 'identity' | 'manual' | null
}

export type SubjectPostPreview = {
  bodySnippet: string | null
  media: Array<{ url: string; thumbnailUrl: string | null; kind: string }>
}

export type SubjectArticlePreview = {
  title: string | null
  excerpt: string | null
  thumbnailUrl: string | null
  visibility: string | null
}

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
  title: string | null
  body: string | null
  subjectPostPreview?: SubjectPostPreview | null
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
  data: { count: number }
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

export type MessageReplySnippet = {
  id: string
  senderUsername: string | null
  bodyPreview: string
  mediaThumbnailUrl: string | null
}

export type MessageReaction = {
  id: string
  emoji: string
  label: string
}

export type MessageMedia = {
  id: string
  kind: PostMediaKind
  source: PostMediaSource
  url: string
  mp4Url: string | null
  thumbnailUrl: string | null
  width: number | null
  height: number | null
  durationSeconds: number | null
  alt: string | null
}

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
}

export type WsNotificationsDeletedPayload = {
  notificationIds: string[]
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

export type WsPostInteractionKind = 'boost' | 'bookmark'
export type WsPostsInteractionPayload = {
  postId: string
  actorUserId: string
  kind: WsPostInteractionKind
  active: boolean
  boostCount?: number
  bookmarkCount?: number
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

/** New top-level post from someone the viewer follows; pushed to each follower's user room. */
export type WsFeedNewPostPayload = {
  post: FeedPost
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
  locationInput: string | null
  locationDisplay: string | null
  locationZip: string | null
  locationCity: string | null
  locationCounty: string | null
  locationState: string | null
  locationCountry: string | null
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
  /** Included by /auth/me bootstrap response for fast badge hydration. */
  notificationUndeliveredCount?: number
  /** Included by /auth/me bootstrap response for fast badge hydration. */
  messageUnreadCounts?: {
    primary: number
    requests: number
  }
}

export type WsUsersMeUpdatedPayload = {
  user: UserDto
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

export type GetCheckinsTodayResponse = {
  dayKey: string
  prompt: string
  hasCheckedInToday: boolean
  coins: number
  checkinStreakDays: number
  allowedVisibilities: CheckinAllowedVisibility[]
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
  premiumUsers: number
  premiumPlusUsers: number
  /** Users with at least one active (non-revoked, non-expired) subscription grant */
  usersWithActiveGrants: number
  dau: number
  mau: number
  /** Sum of all user coin balances — total coins in the economy */
  totalCoinsInEconomy: number
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
}

export type AdminAnalyticsSpaces = {
  /** All-time total spaces. */
  totalSpaces: number
  /** Spaces currently marked isActive = true. */
  activeSpaces: number
  /** Spaces created within the selected range. */
  spacesCreatedInRange: number
  /** All-time spaces by current mode (NONE / WATCH_PARTY / RADIO). */
  byMode: Record<string, number>
  /** Time series — spaces created per bucket in the selected range. */
  created: AdminAnalyticsTimeSeriesPoint[]
  /** Currently active spaces, most recently updated first. */
  topSpaces: AdminAnalyticsSpacesTopRow[]
}

export type AdminAnalytics = {
  range: AnalyticsRange
  granularity: AnalyticsGranularity
  summary: AdminAnalyticsSummary
  signups: AdminAnalyticsTimeSeriesPoint[]
  postsByVisibility: Record<string, number>
  posts: AdminAnalyticsTimeSeriesPoint[]
  checkins: AdminAnalyticsTimeSeriesPoint[]
  messages: AdminAnalyticsTimeSeriesPoint[]
  follows: AdminAnalyticsTimeSeriesPoint[]
  retention: AdminAnalyticsRetentionRow[]
  engagement: AdminAnalyticsEngagement
  monetization: AdminAnalyticsMonetization
  coins: AdminAnalyticsCoins
  articles: AdminAnalyticsArticles
  groups: AdminAnalyticsGroups
  spaces: AdminAnalyticsSpaces
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
  }
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
