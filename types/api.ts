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

/** Read-only founder diagnostics; currently consumed by the MCP/CLI. */
export type AdminMemberDiagnostics = Contracts.AdminMemberDiagnosticsDto
export type AdminOperationsHealth = Contracts.AdminOperationsHealthDto
export type AdminOperationsContent = Contracts.AdminOperationsContentDto

/** Success envelope: payload in `data`, optional cursor/counts in `pagination`. */
export type ApiEnvelope<T, Pagination = ApiPagination> = { data: T; pagination?: Pagination }

/** Minimal org account shown alongside affiliated users. */
export type OrgAffiliation = Contracts.OrgAffiliationDto

/** Short-lived URL for transferring an authenticated native session to the browser. */
export type BrowserHandoff = Contracts.BrowserHandoffDto

export type VerifiedStatus = Contracts.VerifiedStatus

export type AccountKind = Contracts.AccountKind

// ─── Board ──────────────────────────────────────────────────────────────────
export type PostBoardPreview = Contracts.PostBoardPreviewDto
export type BoardVisibility = Contracts.BoardVisibility
export type BoardThread = Contracts.BoardThreadDto & {
  /** Comments by others since the viewer last opened the thread; null when signed out, never opened, or locked. */
  newCommentCount?: number | null
}
export type BoardLeaderboard = Contracts.BoardLeaderboardDto
export type BoardLeaderboardUser = Contracts.BoardLeaderboardUserDto
export type BoardComment = Contracts.BoardCommentDto
export type BoardCommentsPage = Contracts.BoardCommentsPageDto
export type BoardCommentContext = Contracts.BoardCommentContextDto
export type BoardTag = Contracts.BoardTagDto
export type BoardPreferences = Contracts.BoardPreferencesDto
export type BoardNewThreadPayload = Contracts.BoardNewThreadPayloadDto
export type BoardSort = 'top' | 'new' | 'comments'
export type BoardRange = 'day' | 'week' | 'month' | 'year' | 'all'

// ─── Members map ────────────────────────────────────────────────────────────
export type MembersMapUser = Contracts.UserListDto
export type MembersMapState = Contracts.MembersMapStateDto
export type MembersMapOnlineEntry = Contracts.MembersMapOnlineEntryDto
export type MembersMapTotals = Contracts.MembersMapTotalsDto
export type MembersMapSummary = Contracts.MembersMapSummaryDto

export type AccountSwitch = Contracts.AccountSwitchDto

export type SwitchableAccount = Contracts.SwitchableAccountDto

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
  /** Unique logged-out visitors with a live socket. Hidden in the UI when zero. */
  anonymousOnline?: number
  /** Tier breakdown of currently-online users. Populated by /presence/online. */
  premiumPlus?: number
  premium?: number
  verified?: number
  unverified?: number
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
export type BillingSource = Contracts.BillingSource

export type BillingMe = Contracts.BillingMeDto

export type Recruit = Omit<FollowListUser, 'relationship'> & {
  relationship?: FollowRelationship
  recruitedAt: string
  /** @deprecated use verifiedStatus !== 'none' */
  isVerified: boolean
  isPremium: boolean
  bonusGranted: boolean
}

export type ReferralMe = Contracts.ReferralMeDto

export type AdminReferralInfo = Contracts.AdminReferralInfoDto

export type AdminAcquisitionRow = Contracts.AdminAcquisitionRowDto

export type AdminAcquisition = Contracts.AdminAcquisitionDto

export type AdminReferralAnalytics = Contracts.AdminReferralAnalyticsDto

// ─── Affiliate program (Referral Pilot) ──────────────────────────────────────

export type AffiliateEarningType = Contracts.AffiliateEarningType

export type AffiliateEarning = Contracts.AffiliateEarningDto

export type AffiliateSummary = Contracts.AffiliateSummaryDto

export type AdminAffiliateUser = Contracts.AdminAffiliateUserDto

export type AdminAffiliateSettle = Contracts.AdminAffiliateSettleDto

/** Summary of banked free months for admin grant management UI. */
export type AdminGrantSummary = Contracts.AdminGrantSummaryDto

export type BillingCheckoutSession = Contracts.BillingCheckoutSessionDto

export type BillingPortalSession = Contracts.BillingPortalSessionDto

export type NotificationPreferences = Contracts.NotificationPreferencesDto

/** Shared shape for Radio and Space lobby members (listeners/members). */
export type LobbyMember = {
  id: string
  username: string | null
  avatarUrl: string | null
  avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  verifiedStatus: VerifiedStatus
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
  verifiedStatus: VerifiedStatus
}

export type RadioStation = Contracts.RadioStationDto

export type RadioListener = Contracts.RadioListenerDto

export type RadioLobbyCounts = Contracts.RadioLobbyCountsDto

export type RadioChatSender = Contracts.RadioChatSenderDto

export type RadioChatMessage = Contracts.RadioChatMessageDto

export type RadioChatSnapshot = Contracts.RadioChatSnapshotDto

export type SpaceOwner = Contracts.SpaceOwnerDto

export type Space = Contracts.SpaceDto

/** Viewer-agnostic live patch for lobby / host schedule UI (`spaces:updated`). */
export type WsSpacesUpdatedPayload = Contracts.SpacesUpdatedPayloadDto

export type SpaceMember = LobbyMember

export type WatchPartyState = Contracts.WatchPartyStateDto

export type SpaceModeChanged = Contracts.SpaceModeChangedDto

export type SpaceLobbyCounts = Contracts.SpaceLobbyCountsDto

export type SpaceChatSender = Contracts.SpaceChatSenderDto

export type SpaceChatMediaItem = Contracts.SpaceChatMediaItemDto

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

export type SpaceChatSnapshot = Contracts.SpaceChatSnapshotDto

export type SpaceReaction = Contracts.SpaceReactionDto

export type SpaceReactionEvent = Contracts.SpaceReactionEventDto

export type SpaceChatReactionEvent = Contracts.SpaceChatReactionEventDto

export type Websters1828WordOfDay = Contracts.Websters1828WordOfDayDto

export type WotdLikeBreakdown = Contracts.WotdLikeBreakdownDto

export type WotdLikeToggle = Contracts.WotdLikeToggleDto

export type DailyQuoteKind = Contracts.DailyQuoteKindDto
export type DailyQuote = Contracts.DailyQuoteDto

export type DailyContentToday = Contracts.DailyContentTodayDto

export type AdminEmailSampleType = 'weekly_digest' | 'new_notifications' | 'instant_high_signal' | 'streak_reminder'
export type AdminEmailSampleSendResult = Contracts.AdminEmailSampleSendResultDto

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
  verifiedStatus: VerifiedStatus
  avatarUrl: string | null
  avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
  orgAffiliations?: OrgAffiliation[]
  isBot?: boolean
  /** Joined within the last 7 days. */
  isNewMember?: boolean
  /** When true, author is banned; id/username/name/avatar are redacted. */
  authorBanned?: boolean
}

export type PostMention = Contracts.PostMentionDto

// ─── Profile links (public links page) ─────────────────────────────────────
export type ProfileLinkIcon = Contracts.ProfileLinkIcon
export type ProfileLink = Contracts.ProfileLinkDto
export type ConnectedAccount = Contracts.ConnectedAccountDto
export type LinksPageRecentItem = Contracts.LinksPageRecentItemDto
export type LinksPage = Contracts.LinksPageDto
export type MyProfileLink = Contracts.MyProfileLinkDto
export type MyConnectedAccount = Contracts.MyConnectedAccountDto
export type MyProfileLinks = Contracts.MyProfileLinksDto

/** Public profile payload from GET /users/:username */
export type PublicProfile = {
  id: string
  createdAt: string
  username: string | null
  name: string | null
  bio: string | null
  /** @deprecated Mirror of the first website link; render `links` instead. */
  website: string | null
  /** Public custom links in display order. Absent only on payloads from older API deployments. */
  links?: ProfileLink[]
  xUsername: string | null
  pickaxUsername: string | null
  rumbleUrl: string | null
  linkedinUrl: string | null
  youtubeUrl: string | null
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
  accountKind?: AccountKind
  verifiedStatus: VerifiedStatus
  avatarUrl: string | null
  avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
  bannerUrl: string | null
  pinnedPostId: string | null
  lastOnlineAt: string | null
  checkinStreakDays: number
  longestStreakDays: number
  postCount?: number
  articleCount?: number
  /** Boosts received across the member's live Board posts and comments. */
  boardPoints?: number
  /** Organization accounts only: how many members represent this org. Null for people. */
  affiliateCount?: number | null
  orgAffiliations?: OrgAffiliation[]
  /** True when the viewer has blocked this user. */
  viewerHasBlockedUser?: boolean
  /** True when the viewer has muted this user. */
  viewerHasMutedUser?: boolean
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
  verifiedStatus?: VerifiedStatus
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
  accountKind?: AccountKind
  verifiedStatus: VerifiedStatus
  avatarUrl: string | null
  avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
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
export type CommunityGroupPreview = Contracts.CommunityGroupPreviewDto

/**
 * Server-cached video embed for the post's preview link. Lets the feed lay out
 * the player at its final aspect ratio on first paint (no `/link-metadata` wait).
 */
export type PostVideoEmbed = Contracts.PostVideoEmbedDto

export type ConversationInsights = Contracts.ConversationInsightsDto
export type ConversationContext = Contracts.ConversationContextDto
export type ConversationDay = Contracts.ConversationDayDto

export type FeedPost = {
  conversationContext?: ConversationContext
  id: string
  createdAt: string
  editedAt?: string | null
  editCount?: number
  body: string
  deletedAt: string | null
  kind?: 'regular' | 'checkin' | 'repost' | 'articleShare' | 'status' | 'fitnessShare' | 'board'
  /** kind=board: the Board thread root id (equals `id` for the thread). Routes to /b/:boardRootId. */
  boardRootId?: string
  /** kind=board comments: the thread's title (trimmed for gated viewers). */
  boardThreadTitle?: string
  /** kind=board thread roots: Board card fields (gated viewers get a trimmed title and no link). */
  board?: PostBoardPreview
  checkinDayKey?: string | null
  checkinPrompt?: string | null
  visibility: PostVisibility
  isDraft?: boolean
  /** Public Pickax permalink when the author cross-posted this post to Pickax. */
  pickaxUrl?: string | null
  /** Author-only: why Pickax rejected the last cross-post attempt. */
  pickaxError?: string | null
  /** Public X status URL when the author cross-posted this post to X. */
  xUrl?: string | null
  /** Author-only: why X rejected the last cross-post attempt. */
  xError?: string | null
  topics?: string[]
  /** Root posts: Jev's read that the post asks a question or invites discussion (drives the reply nudge). */
  replyPrompt?: 'question' | 'discussion' | null
  /** User-created hashtags parsed from body text (lowercase, without '#'). */
  hashtags?: string[]
  /** Validated cashtag symbols parsed from body text (uppercase, without '$', e.g. "SPY"). */
  cashtags?: string[]
  boostCount: number
  bookmarkCount: number
  commentCount?: number
  /** Denormalized count of flat reposts + quote reposts referencing this post. */
  repostCount?: number
  /** Quote reposts of this post (permalink Quotes section). */
  quoteCount?: number
  /** Unique people (person × post). */
  viewerCount?: number
  /** Accepted impressions, including revisits after the 30s gate. */
  totalViewCount?: number
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
  viewerHasCommented?: boolean
  viewerHasReposted?: boolean
  /** True if the viewer has viewed this post (exists in PostView table). */
  viewerHasViewed?: boolean
  /** Viewer's last dwell on this post (ISO). For You uses this for seen-aware thread rollup. */
  viewerLastSeenAt?: string
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
  /** Present when the preview link's video embed is already cached server-side. */
  videoEmbed?: PostVideoEmbed
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
  /** True while a chosen cross-post is still waiting for its public link. */
  _crosspostPending?: { pickax?: boolean; x?: boolean } | null
  /** Stable id used to find/replace this row across pending → real transitions. */
  _localId?: string | null
  /** User-facing error message when `_pending === 'failed'`. */
  _pendingError?: string | null
}

export type PostViewAck = Contracts.PostViewAckDto

export type ArticleViewAck = Contracts.ArticleViewAckDto

export type PostViewBreakdown = {
  premium: number
  verified: number
  unverified: number
  guest: number
  /** Unique people. */
  total: number
  totalViewCount: number
  premiumTotal: number
  verifiedTotal: number
  unverifiedTotal: number
  guestTotal: number
}

export type ArticleViewBreakdown = {
  premium: number
  verified: number
  unverified: number
  guest: number
  /** Unique people. */
  total: number
  totalViewCount: number
  premiumTotal: number
  verifiedTotal: number
  unverifiedTotal: number
  guestTotal: number
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
  | 'channel_upload'
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
  | 'announcement'
  | 'newsletter'
  | 'channel_upload'
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
  channelId?: string | null
  channelName?: string | null
  channelPrivacy?: string | null
  uploaderUsername?: string | null
  uploaderId?: string | null
  announcementId?: string | null
  newsletterId?: string | null
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

export type ReportItem = Contracts.ReportDto
export type AdminReportItem = Contracts.ReportAdminDto

/** Data type for GET /admin/reports (array); pagination in envelope. */
export type AdminReportListData = AdminReportItem[]

export type VerificationRequestStatus = Contracts.VerificationRequestStatus

export type VerificationRequestPublic = Contracts.VerificationRequestPublicDto

/** Data type for GET /verification/me. */
export type MyVerificationStatus = {
  verifiedStatus: VerifiedStatus
  verifiedAt: string | null
  unverifiedAt: string | null
  latestRequest: VerificationRequestPublic | null
}

export type AdminVerificationUser = {
  id: string
  createdAt: string
  phone: string | null
  email: string | null
  username: string | null
  usernameIsSet: boolean
  name: string | null
  siteAdmin: boolean
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  verifiedStatus: VerifiedStatus
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
    /** Echo as `referencesToken` on delete; a 409 `references_changed` means ownership changed since review. */
    referencesToken: string
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
    channelUploads?: Array<{
      uploadId: string
      channelId: string
      userId: string
      username: string | null
      channelName: string
      groupId: string
      groupName: string
      groupSlug: string
      expiresAt: string
    }>
    messages: Array<{
      channelId?: string
      channelName?: string
      channelPrivacy?: string
      groupId?: string
      groupName?: string
      groupSlug?: string
      sentAt: string
      senderId: string
      senderUsername: string | null
      senderName: string | null
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
      verifiedStatus: VerifiedStatus
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
    announcements?: Array<{ id: string; title: string; status: string; isInline: boolean }>
    newsletters?: Array<{ id: string; title: string; status: string; isInline: boolean }>
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

export type CrosspostQueueResult =
  | { status: 'queued'; mode?: 'link' | 'native' }
  | { status: 'skipped'; reason: string }
  | null

/** Data type for POST /posts (created post). */
export type CreatePostData = {
  post: FeedPost
  streakReward: PostStreakReward | null
  /** Set when the client asked to cross-post to Pickax. Kept for older clients. */
  pickax?: CrosspostQueueResult
  crossposts?: { pickax?: CrosspostQueueResult; x?: CrosspostQueueResult }
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

export type UserNotificationPreference = Contracts.UserNotificationPreference
export type UserNotificationPreferences = Contracts.UserNotificationPreferencesDto

export type FollowRelationship = {
  viewerFollowsUser: boolean
  userFollowsViewer: boolean
  viewerPostNotificationsEnabled: boolean
  viewerNotificationPreference?: UserNotificationPreference
}

export type NudgeState = Contracts.NudgeStateDto

export type FollowSummaryResponse = FollowRelationship & {
  canView: boolean
  followerCount: number | null
  followingCount: number | null
  nudge: NudgeState | null
  /** Accounts the viewer follows who also follow this user. Null when signed out or on your own profile. */
  followedBy?: FollowedByPreview | null
}

/** Social proof preview: a few names/avatars plus the full count behind them. */
export type FollowedByPreview = {
  users: Array<{
    id: string
    username: string | null
    name: string | null
    avatarUrl: string | null
    avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
    isOrganization: boolean
  }>
  total: number
}

export type FollowListUser = {
  id: string
  username: string | null
  name: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  accountKind?: AccountKind
  verifiedStatus: VerifiedStatus
  avatarUrl: string | null
  avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
  orgAffiliations?: OrgAffiliation[]
  relationship: FollowRelationship
  /** True when this user is an active member of any Crew. Present on search results. */
  inCrew?: boolean
}

/** Suggested groups and people from `POST /me/onboarding/matches`. */
export type OnboardingMatches = {
  groups: CommunityGroupShell[]
  people: FollowListUser[]
  /** False when the lists are popular picks rather than matches to the member's answers. */
  personalized: boolean
}

/** Search user result (FollowListUser + createdAt for interleaving). */
export type SearchUserResult = FollowListUser & { createdAt?: string }

export type HashtagResult = Contracts.HashtagResultDto

export type CashtagResult = Contracts.CashtagResultDto

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
  /** Currently in a voice/video call. Kept live by `presence:call-changed`. */
  inCall?: boolean
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

export type PresenceOnlinePage = Contracts.PresenceOnlinePageDto

/** Data type for GET /presence/online-page (object); totalOnline + recentNextCursor in pagination. */
export type GetPresenceOnlinePageData = PresenceOnlinePage

export type ActiveUsersMetrics = Contracts.ActiveUsersMetricsDto

/** Data type for GET /metrics/active-users. */
export type GetActiveUsersMetricsData = ActiveUsersMetrics

export type Topic = Contracts.TopicDto

export type TopicCategory = Contracts.TopicCategoryDto

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

export type NotificationCategory = Contracts.NotificationCategory
export type NotificationKind = Contracts.NotificationKind

export type NotificationGroupKind = Contracts.NotificationGroupKind

export type NotificationActor = Contracts.NotificationActorDto

export type SubjectPostPreview = Contracts.SubjectPostPreviewDto

export type SubjectArticlePreview = Contracts.SubjectArticlePreviewDto

/** Tier of the notification subject (post visibility or user tier) for unseen row highlight. */
export type SubjectTier = Contracts.SubjectTier

export type Notification = {
  actionPath?: string | null
  id: string
  createdAt: string
  kind: NotificationKind
  category?: NotificationCategory
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
  /** Set when the event is about a Board thread/comment: route to /b/… and tag the row "Board". */
  boardThreadId?: string | null
  boardCommentId?: string | null
}

export type NotificationGroup = Contracts.NotificationGroupDto

export type FollowedPostsRollup = Contracts.FollowedPostsRollupDto

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
    unreadByCategory?: Partial<Record<NotificationCategory | 'all', number>>
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
    /** Unread Board notifications — drives the Board nav dot. */
    boardUnreadCount: number
    /** Unseen Board mentions, counted into the Board nav badge. */
    boardMentionCount?: number
    /** Unread article notifications — drives the Articles nav dot. */
    articlesUnreadCount: number
    hasUnreadNotifications?: boolean
  }
}

export type MessageConversationType = 'direct' | 'group' | 'crew_wall'

/**
 * Lightweight crew summary attached to `crew_wall` conversations so the chat
 * list/header can render the crew avatar, label the row as a Crew chat, and
 * deep-link to /c/:slug without a per-row round-trip.
 */
export type MessageConversationCrewSummary = Contracts.MessageConversationCrewSummaryDto
export type MessageParticipantStatus = Contracts.MessageParticipantStatus
export type MessageParticipantRole = Contracts.MessageParticipantRole

export type MessageUser = {
  id: string
  username: string | null
  name: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  verifiedStatus: VerifiedStatus
  avatarUrl: string | null
  avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
  isBot?: boolean
}

export type MessageParticipant = {
  user: MessageUser
  status: MessageParticipantStatus
  role: MessageParticipantRole
  acceptedAt: string | null
  lastReadAt: string | null
}

export type MessageReactionSummary = Contracts.MessageReactionSummaryDto

export type MessageReplySnippet = Contracts.MessageReplySnippetDto

export type MessageReaction = {
  id: string
  emoji: string
  label: string
}

export type MessageMedia = Contracts.MessageMediaDto

// ─── DM calling (browser-to-browser WebRTC; API only signals) ────────────────
export type CallType = Contracts.CallType
export type CallStatus = Contracts.CallStatus
export type CallParticipantConnectionState = Contracts.CallParticipantConnectionState
export type CallParticipant = Contracts.CallParticipantDto
export type CallSession = Contracts.CallSessionDto
export type MessageCallOutcome = Contracts.MessageCallOutcome
export type MessageCall = Contracts.MessageCallDto
export type RtcIceServer = Contracts.RtcIceServerDto
export type RtcSessionDescription = Contracts.RtcSessionDescriptionDto
export type CallsAckErrorCode = Contracts.CallsAckErrorCode
export type CallsAckError = Contracts.CallsAckErrorDto
export type CallsAck = Contracts.CallsAckDto
export type WsCallsIncomingPayload = Contracts.CallsIncomingPayloadDto
export type WsCallsUpdatedPayload = Contracts.CallsUpdatedPayloadDto
export type WsCallsSeatTakenPayload = Contracts.CallsSeatTakenPayloadDto
export type WsRtcSignalPayload = Contracts.RtcSignalPayloadDto
export type WsPresenceCallChangedPayload = Contracts.PresenceCallChangedPayloadDto

export type MessageKind = 'text' | 'call' | 'groupJoin'

export type Message = {
  id: string
  createdAt: string
  body: string
  conversationId: string
  sender: MessageUser
  /** `text` for ordinary chat; `call` for the one-per-call timeline row. */
  kind: MessageKind
  /** Present only when `kind === 'call'`. */
  call: MessageCall | null
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
  /**
   * Last visible message. `body` is the inbox preview: the caption when present,
   * otherwise Voice message / Photo / GIF / Video. Null when the conversation
   * has no messages — clients show "No chats yet." only in that case.
   */
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
  /**
   * Live call session in this conversation, or null. On-load sync for the call UI;
   * `calls:updated` keeps it fresh while the page is open.
   */
  activeCall?: CallSession | null
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

export type WsNotificationsNewPayload = Contracts.NotificationsNewPayloadDto

export type WsNotificationsDeletedPayload = Contracts.NotificationsDeletedPayloadDto

export type WsNotificationsUpdatedPayload = {
  undeliveredCount?: number
  /** Post ids whose related notifications were just marked read (subject or actor). */
  clearedPostIds?: string[]
}

export type WsNotificationsLockScreenClearPayload = Contracts.NotificationsLockScreenClearPayloadDto

export type WsAccountsBadgeUpdatedPayload = Contracts.AccountsBadgeUpdatedPayloadDto

export type WsMessagesReadPayload = Contracts.MessagesReadPayloadDto

export type WsFollowsChangedPayload = Contracts.FollowsChangedPayloadDto

export type WsPostInteractionKind = 'boost' | 'bookmark' | 'repost'
export type WsPostsInteractionPayload = Contracts.PostsInteractionPayloadDto

export type WsPostsSubscribedPayload = Contracts.PostsSubscribedPayloadDto

export type WsPostsLiveUpdatedPayload = Contracts.PostsLiveUpdatedPayloadDto

export type WsArticlesLiveUpdatedPayload = Contracts.ArticlesLiveUpdatedPayloadDto

export type WsArticlesCommentAddedPayload = Contracts.ArticlesCommentAddedPayloadDto

export type WsArticlesCommentDeletedPayload = Contracts.ArticlesCommentDeletedPayloadDto

export type WsArticlesCommentUpdatedPayload = Contracts.ArticlesCommentUpdatedPayloadDto

export type WsArticlesCommentReactionChangedPayload = Contracts.ArticlesCommentReactionChangedPayloadDto

export type WsPostsCommentAddedPayload = Contracts.PostsCommentAddedPayloadDto

export type WsPostsCommentDeletedPayload = Contracts.PostsCommentDeletedPayloadDto

/**
 * Live "someone is replying to this post" indicator.
 * Emitted to `post:{postId}` room subscribers (excluding the sender) while a user is composing a reply.
 *
 * `status` is only set by server-side emitters (e.g. Marvin). Marv emits
 * `'replying'` only after he has committed to a reply, while composing — clients show the
 * same "is replying" copy. `'thinking'` is legacy and should render the same.
 */
export type WsPostsTypingPayload = Contracts.PostsTypingPayloadDto

/** New top-level post from someone the viewer follows; pushed to each follower's user room. */
export type WsFeedNewPostPayload = Contracts.FeedNewPostPayloadDto

/** New top-level post (or repost) in a community group; pushed to the `group:{id}` room. */
export type WsGroupNewPostPayload = Contracts.GroupNewPostPayloadDto

export type WsGroupMarvChangedPayload = Contracts.GroupMarvChangedPayloadDto

/**
 * Live "someone in your circle just answered today's check-in" event.
 * Emitted to followers + crew members of the actor when a `kind: 'checkin'` post is created.
 */
export type WsCheckinAnsweredTodayPayload = Contracts.CheckinAnsweredTodayPayloadDto

export type WsAdminUpdateKind = 'reports' | 'verification' | 'feedback' | 'assistant'
export type WsAdminUpdateAction = 'created' | 'updated' | 'deleted' | 'resolved' | 'reviewed' | 'other'
export type WsAdminUpdatedPayload = Contracts.AdminUpdatedPayloadDto

export type WsUsersSelfUpdatedPayload = Contracts.UsersSelfUpdatedPayloadDto

/** Emitted to subscribers of a user when that user joins or leaves a space. */
export type WsUsersSpaceChangedPayload = Contracts.UsersSpaceChangedPayloadDto

export type WsPresenceStatusUpdatedPayload = Contracts.PresenceStatusUpdatedPayloadDto

export type WsPresenceStatusClearedPayload = Contracts.PresenceStatusClearedPayloadDto

export type WsPresencePlatformsChangedPayload = Contracts.PresencePlatformsChangedPayloadDto

export type HeardAboutUs = Contracts.HeardAboutUs

// Canonical self-only auth/settings snapshot (matches API `/auth/me` user DTO).
export type UserDto = {
  id: string
  createdAt: string
  phone: string | null
  accountKind?: AccountKind
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
  rumbleUrl: string | null
  linkedinUrl: string | null
  youtubeUrl: string | null
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
  heardAboutUs: HeardAboutUs | null
  heardAboutUsOther: string | null
  /** True when a recruiter is already linked (referral code is locked). */
  hasRecruiter: boolean
  siteAdmin: boolean
  featureToggles: string[]
  bannedAt: string | null
  bannedReason: string | null
  bannedByAdminId: string | null
  premium: boolean
  premiumPlus: boolean
  isOrganization: boolean
  verifiedStatus: VerifiedStatus
  verifiedAt: string | null
  unverifiedAt: string | null
  followVisibility: 'all' | 'verified' | 'premium' | 'none'
  birthdayVisibility: 'none' | 'monthDay' | 'full'
  avatarUrl: string | null
  avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
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
  /** Pending group invites the viewer still needs to accept or decline. */
  groupInviteInboxCount?: number
  /** Canonical authored-content totals returned by /auth/me. */
  postCount?: number | null
  articleCount?: number | null
  /**
   * Non-null only while a site admin is impersonating this user ("log in as user").
   * Describes the admin really driving the session.
   */
  impersonation?: Impersonation | null
  accountSwitch?: AccountSwitch | null
}

/** Mirrors `ImpersonationDto` in menofhunger-api/src/common/dto/auth.dto.ts. */
export type Impersonation = Contracts.ImpersonationDto

export type WsUsersMeUpdatedPayload = Contracts.UsersMeUpdatedPayloadDto

export type AdminUserSensitiveFields = Contracts.AdminUserSensitiveFieldsDto

export type AdminUserDetailData = UserDto & {
  orgAffiliations: OrgAffiliation[]
  sensitive: AdminUserSensitiveFields
  canRevealSensitive: boolean
}

export type AdminUserRecentPost = Contracts.AdminUserRecentPostDto

export type AdminUserRecentArticle = Contracts.AdminUserRecentArticleDto

export type AdminUserRecentSearch = Contracts.AdminUserRecentSearchDto

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
  avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
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
  isOpen: boolean
  opensAt?: string
  closesAt?: string
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
  avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
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
  verifiedStatus: VerifiedStatus
  avatarUrl: string | null
  avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
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

export type AnalyticsRange = Contracts.AnalyticsRange
export type AnalyticsGranularity = Contracts.AnalyticsGranularity

export type AdminAnalyticsTimeSeriesPoint = {
  bucket: string
  count: number
}

export type AdminAnalyticsSummary = Contracts.AdminAnalyticsSummaryDto

export type AdminAnalyticsTopPost = Contracts.AdminAnalyticsTopPostDto

export type AdminAnalyticsRetentionRow = Contracts.AdminAnalyticsRetentionRow

export type AdminAnalyticsEngagement = Contracts.AdminAnalyticsEngagementDto

export type AdminAnalyticsMonetization = Contracts.AdminAnalyticsMonetizationDto

export type AdminAnalyticsCoins = Contracts.AdminAnalyticsCoinsDto

export type AdminAnalyticsTopArticle = Contracts.AdminAnalyticsTopArticleDto

export type AdminAnalyticsArticleKpi = Contracts.AdminAnalyticsArticleKpiDto

export type AdminAnalyticsArticles = Contracts.AdminAnalyticsArticlesDto

export type AdminAnalyticsGroupsTopRow = Contracts.AdminAnalyticsGroupsTopRowDto

export type AdminAnalyticsGroups = Contracts.AdminAnalyticsGroupsDto

export type AdminAnalyticsSpacesTopRow = Contracts.AdminAnalyticsSpacesTopRowDto

export type AdminAnalyticsSpaces = Contracts.AdminAnalyticsSpacesDto

export type AdminAnalyticsAI = Contracts.AdminAnalyticsAIDto

export type AdminAnalyticsChannelsTopRow = Contracts.AdminAnalyticsChannelsTopRowDto
export type AdminAnalyticsChannels = Contracts.AdminAnalyticsChannelsDto
export type AdminAnalyticsBoard = Contracts.AdminAnalyticsBoardDto
export type AdminAnalyticsBoardTopThread = Contracts.AdminAnalyticsBoardTopThreadDto

export type AdminAnalytics = Contracts.AdminAnalyticsDto

/** Marv briefing of the already-loaded admin analytics snapshot. */
export type AdminAnalyticsBrief = Contracts.AdminAnalyticsBriefDto

export type AdminIntroPerson = Contracts.AdminIntroPersonDto
export type AdminIntroPair = Contracts.AdminIntroPairDto
export type AdminIntroBrief = Contracts.AdminIntroBriefDto
export type AdminIntroBriefQueued = Contracts.AdminIntroBriefQueuedDto

export type LandingMenBreakdown = Contracts.LandingMenBreakdownDto

export type LandingPostBreakdown = Contracts.LandingPostBreakdownDto

/**
 * Site-wide post views. Tier rows are unique people; `total` is impressions.
 */
export type LandingViewsBreakdown = Contracts.LandingViewsBreakdownDto

/** Published articles by landing-eligible authors (drafts/deleted/onlyMe excluded). */
export type LandingArticleBreakdown = Contracts.LandingArticleBreakdownDto

/** Board threads (minus article mirrors) and comments by landing-eligible authors; not part of posts. */
export type LandingBoardBreakdown = Contracts.LandingBoardBreakdownDto

export type LandingStats = Contracts.LandingStatsDto

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
export type CommunityGroupShell = Contracts.CommunityGroupShellDto

export type CommunityGroupMemberListItem = Contracts.CommunityGroupMemberListItemDto

export type CommunityGroupPendingMember = {
  userId: string
  username: string | null
  name: string | null
  requestedAt: string
}

// ─── Community group invites ─────────────────────────────────────────────────

export type CommunityGroupInviteStatus = Contracts.CommunityGroupInviteStatus

/** Lightweight group ref returned with each invite (for inbox row rendering). */
export type CommunityGroupInviteGroupRef = Contracts.CommunityGroupInviteGroupRefDto

export type CommunityGroupInvite = Contracts.CommunityGroupInviteDto

/**
 * Annotation returned by `/groups/:groupId/invitable-users` so the picker can
 * render hints like "Already a member" or "Declined — try again on Mar 14".
 */
export type CommunityGroupInvitableUserStatus = Contracts.CommunityGroupInvitableUserStatus

export type CommunityGroupInvitableUser = Contracts.CommunityGroupInvitableUserDto

// ─── Articles ────────────────────────────────────────────────────────────────

export type ArticleReactionSummary = Contracts.ArticleReactionSummaryDto

export type ArticleAuthor = Contracts.ArticleAuthorDto

export type ArticleTag = Contracts.ArticleTagDto

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
  /** Public Pickax permalink when the author cross-posted this article to Pickax. */
  pickaxUrl?: string | null
  /** Author-only: why Pickax rejected the last cross-post attempt. */
  pickaxError?: string | null
  /** Public X status URL when the author shared this article on X. */
  xUrl?: string | null
  /** Author-only: why X rejected the last cross-post attempt. */
  xError?: string | null
  boostCount: number
  commentCount: number
  viewCount: number
  totalViewCount: number
  author: ArticleAuthor
  reactions: ArticleReactionSummary[]
  tags: ArticleTag[]
  readingTimeMinutes?: number
  viewerHasBoosted?: boolean
  viewerHasViewed?: boolean
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

export type FitnessProvider = Contracts.FitnessProvider
export type FitnessActivityType = Contracts.FitnessActivityType
export type FitnessUnits = Contracts.FitnessUnits
export type FitnessShareType = Contracts.FitnessShareType

export type FitnessConnection = Contracts.FitnessConnectionDto

export type FitnessActivity = Contracts.FitnessActivityDto

/** Full activity for the detail page. `raw` is the provider payload (or a normalized fallback). */
export type FitnessActivityDetail = Contracts.FitnessActivityDetailDto

export type FitnessDailySummary = Contracts.FitnessDailySummaryDto

export type FitnessStepsDay = Contracts.FitnessStepsDayDto

export type FitnessBodyMetric = Contracts.FitnessBodyMetricDto

export type FitnessGoal = Contracts.FitnessGoalDto

export type FitnessActivitySnapshot = Contracts.FitnessActivitySnapshotDto

export type FitnessWeightSnapshot = Contracts.FitnessWeightSnapshotDto

export type FitnessProgressSnapshot = Contracts.FitnessProgressSnapshotDto

export type FitnessVo2MaxSnapshot = Contracts.FitnessVo2MaxSnapshotDto

export type FitnessShareSnapshot = Contracts.FitnessShareSnapshotDto

export type FitnessSharePreview = Contracts.FitnessSharePreviewDto

export type FitnessWeekSummary = Contracts.FitnessWeekSummaryDto

export type FitnessPage = Contracts.FitnessPageDto

export type ArticleComment = Contracts.ArticleCommentDto


export type CoinTransferCounterparty = Contracts.CoinTransferCounterpartyDto

export type CoinTransferItem = {
  id: string
  createdAt: string
  amount: number
  note: string | null
  direction: 'sent' | 'received' | 'admin_added' | 'admin_removed' | 'streak_reward' | 'verification_gift'
  counterparty: CoinTransferCounterparty
}

export type CoinTransferReceiptParty = Contracts.CoinTransferReceiptPartyDto

export type CoinTransferReceipt = Contracts.CoinTransferReceiptDto

export type TransferCoinsRequest = Contracts.TransferCoinsRequest

export type TransferCoinsResponse = Contracts.TransferCoinsResponse

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

export type CrewMemberRole = Contracts.CrewMemberRole

export type CrewInviteStatus = Contracts.CrewInviteStatus

export type CrewMemberListItem = Contracts.CrewMemberListItemDto

/** Shared user summary used by crew DTOs (matches the API UserListDto shape). */
export type CrewUserSummary = Omit<FollowListUser, 'relationship' | 'orgAffiliations'> & {
  orgAffiliations?: OrgAffiliation[]
}

export type CrewPublic = Contracts.CrewPublicDto

export type CrewPrivate = Contracts.CrewPrivateDto

export type CrewInvite = Contracts.CrewInviteDto

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
export type MarvinModeDto = Contracts.MarvinModeDto
/** Source channel; mirrors the API's `MarvinSource` enum. */
export type MarvinSourceDto = Contracts.MarvinSourceDto

/** Snapshot of the requester's Marv credit bucket. Returned by `GET /marvin/me`. */
export type MarvinCreditSummaryDto = Contracts.MarvinCreditSummaryDto

/** Per-mode credit costs, sourced from server config. Used to preview spend before "Catch me up". */
export type MarvinCostsDto = Contracts.MarvinCostsDto

/** `GET /marvin/me` response body. Used by chat page + settings + composer mode pill. */
export type MarvinMeDto = Contracts.MarvinMeDto

/** Body for `PATCH /marvin/me/preferences`. */
export type MarvinUpdatePreferencesBodyDto = Contracts.MarvinUpdatePreferencesBodyDto

/** `GET /marvin/me/context-card` — what Marv knows about the viewer (or null if not generated). */
export type MarvinContextCardDto = Contracts.MarvinContextCardDto

/** A single Marv interaction event (success, canned, or failure). */
export type MarvinUsageEventDto = Contracts.MarvinUsageEventDto

/** Realtime payload for `marv:credits-updated`. Same shape as `MarvinCreditSummaryDto`. */
export type MarvCreditsUpdatedPayloadDto = MarvinCreditSummaryDto

/** Body for `POST /marvin/catch-up/:postId`. */
export type MarvinCatchUpBodyDto = Contracts.MarvinCatchUpBodyDto

/**
 * Result of a "Catch me up" request — an AI summary of the conversation above AND
 * below a focal post. Returned by `POST /marvin/catch-up/:postId`.
 */
export type MarvinCatchUpDto = Contracts.MarvinCatchUpDto

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
  accountKind?: AccountKind
  verifiedStatus: VerifiedStatus
  avatarUrl: string | null
  avatarVideo?: import('~/types/api-contracts.gen').AvatarVideoDto | null
  orgAffiliations?: OrgAffiliation[]
  relationship?: FollowRelationship
}

/** Minimal group info on a recent search entry (group tap). */
export type RecentSearchGroup = Contracts.RecentSearchGroupDto

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
  isOpen: boolean
  opensAt?: string
  closesAt?: string
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
export type AnnouncementPlacement = Contracts.AnnouncementPlacement
export type Announcement = Contracts.AnnouncementDto
export type AnnouncementStats = Contracts.AnnouncementStatsDto
export type AnnouncementAdmin = Contracts.AnnouncementAdminDto

// ─── Admin newsletter ────────────────────────────────────────────────────────

export type NewsletterStatus = Contracts.NewsletterStatusDto
export type NewsletterDurationUnit = Contracts.NewsletterDurationUnit
export type NewsletterAudienceFilter = Contracts.NewsletterAudienceFilter
export type NewsletterAudienceCount = Contracts.NewsletterAudienceCountDto
export type NewsletterAdmin = Contracts.NewsletterAdminDto
export type NewsletterPreview = Contracts.NewsletterPreviewDto

// The admin workspace is shared with native/handoff clients and the MCP catalog.
export type { AdminCapabilityDto, AdminAssistantActionDto, AdminAssistantTurnDto, AdminAssistantWorkspaceDto } from './api-contracts.gen'

export type { AdminAttentionDto, AdminActivationDto, MarvinPersonalActionDto, MarvinParticipationDto } from "./api-contracts.gen"

export type DelegationWorkspaceDto = Contracts.DelegationWorkspaceDto
export type DelegationJobDto = Contracts.DelegationJobDto
export type DelegationActionDto = Contracts.DelegationActionDto
export type DelegationScheduleDto = Contracts.DelegationScheduleDto

export type GroupNotificationPreferences = Contracts.GroupNotificationPreferencesDto
export type GroupActivity = Contracts.GroupActivityDto

export type { ActivationDto, ActivationCompletionDto } from './api-contracts.gen'

/** Read grants are separate from outward platform credentials. */
export type PartnerConnection = {
  status?: 'active' | 'expired' | 'suspended' | 'needs_reauthorization'
  id: string
  clientName: string
  accountId: string
  scopes: string[]
  createdAt: string
  expiresAt: string
}

export type GroupChannel = Contracts.GroupChannelDto
export type ChannelMessage = Contracts.GroupChannelMessageDto
export type ChannelReference = Contracts.GroupChannelReferenceDto
export type ChannelMember = Contracts.GroupChannelMemberDto
export type ChannelAttention = Contracts.GroupChannelAttentionDto
export type ChannelChangedEvent = Contracts.GroupChannelChangedPayloadDto
export type ChannelMessagesEvent = Contracts.GroupChannelMessagesPayloadDto
export type ChannelTypingEvent = {
  groupId: string
  channelId: string
  threadRootId: string | null
  user: WsPostsTypingPayload['user']
  typing: boolean
}
export type ChannelViewerEvent = Contracts.GroupChannelViewerPayloadDto
