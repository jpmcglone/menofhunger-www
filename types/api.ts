/** Success envelope: payload in `data`, optional cursor/counts in `pagination`. */
export type ApiEnvelope<T> = { data: T; pagination?: ApiPagination }

export type ApiPagination = {
  nextCursor?: string | null
  counts?: {
    all: number
    public: number
    verifiedOnly: number
    premiumOnly: number
  } | null
  totalOnline?: number
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

export type BillingMe = {
  premium: boolean
  premiumPlus: boolean
  verified: boolean
  subscriptionStatus: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
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
  emailDigestDaily: boolean
  emailNewNotifications: boolean
  emailInstantHighSignal: boolean
}

export type RadioStation = {
  id: string
  name: string
  streamUrl: string
  attributionName: string | null
  attributionUrl: string | null
}

export type RadioListener = {
  id: string
  username: string | null
  avatarUrl: string | null
  paused?: boolean
}

export type Websters1828WordOfDay = {
  word: string
  dictionaryUrl: string
  definition: string | null
  definitionHtml: string | null
  sourceUrl: string
  fetchedAt: string
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
  relationship: FollowRelationship
  nudge: NudgeState | null
  followerCount: number | null
  followingCount: number | null
}

export type FeedPost = {
  id: string
  createdAt: string
  editedAt?: string | null
  editCount?: number
  body: string
  deletedAt: string | null
  visibility: PostVisibility
  isDraft?: boolean
  topics?: string[]
  /** User-created hashtags parsed from body text (lowercase, without '#'). */
  hashtags?: string[]
  boostCount: number
  bookmarkCount: number
  commentCount?: number
  parentId?: string | null
  /** When present, this post is a reply and the parent is included for thread display. */
  parent?: FeedPost
  mentions?: PostMention[]
  media: PostMedia[]
  poll?: PostPoll | null
  viewerHasBoosted?: boolean
  viewerHasBookmarked?: boolean
  viewerBookmarkCollectionIds?: string[]
  internal?: {
    boostScore: number | null
    boostScoreUpdatedAt: string | null
    /** Overall popularity score (from popular feed). Admin only. */
    score?: number | null
  }
  author: PostAuthor
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

/** Data type for POST /posts (created post). */
export type CreatePostData = FeedPost

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
  relationship: FollowRelationship
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

/** Mixed search result: users + posts. */
export type SearchMixedResult = {
  users: SearchUserResult[]
  posts: FeedPost[]
}

/** Pagination for mixed search (two cursors). */
export type SearchMixedPagination = {
  nextUserCursor?: string | null
  nextPostCursor?: string | null
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
  | 'follow'
  | 'followed_post'
  | 'mention'
  | 'nudge'
  | 'poll_results_ready'
  | 'generic'

export type NotificationGroupKind = 'comment' | 'boost' | 'follow' | 'followed_post' | 'nudge'

export type NotificationActor = {
  id: string
  username: string | null
  name: string | null
  avatarUrl: string | null
  premium?: boolean
  isOrganization?: boolean
  verifiedStatus?: string | null
}

export type SubjectPostPreview = {
  bodySnippet: string | null
  media: Array<{ url: string; thumbnailUrl: string | null; kind: string }>
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
  title: string | null
  body: string | null
  subjectPostPreview?: SubjectPostPreview | null
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

export type GetNotificationsUnreadCountResponse = {
  data: { count: number }
}

export type MessageConversationType = 'direct' | 'group'
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

export type Message = {
  id: string
  createdAt: string
  body: string
  conversationId: string
  sender: MessageUser
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
}

export type WsUsersMeUpdatedPayload = {
  user: UserDto
  reason?: string
}

