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

export type PostAuthor = {
  id: string
  username: string | null
  name: string | null
  premium: boolean
  premiumPlus: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl: string | null
}

export type PostMention = {
  id: string
  username: string
  verifiedStatus?: 'none' | 'identity' | 'manual'
  premium?: boolean
  premiumPlus?: boolean
}

/** Public profile payload from GET /users/:username */
export type PublicProfile = {
  id: string
  username: string | null
  name: string | null
  bio: string | null
  premium: boolean
  premiumPlus: boolean
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
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl: string | null
  bannerUrl: string | null
  relationship: FollowRelationship
  followerCount: number | null
  followingCount: number | null
}

export type FeedPost = {
  id: string
  createdAt: string
  body: string
  deletedAt: string | null
  visibility: PostVisibility
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
  user: { id: string; username: string | null; name: string | null } | null
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

export type FollowRelationship = {
  viewerFollowsUser: boolean
  userFollowsViewer: boolean
}

export type FollowSummaryResponse = FollowRelationship & {
  canView: boolean
  followerCount: number | null
  followingCount: number | null
}

export type FollowListUser = {
  id: string
  username: string | null
  name: string | null
  premium: boolean
  premiumPlus: boolean
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

export type Topic = {
  topic: string
  score: number
  interestCount: number
  postCount: number
}

/** Data type for GET /topics (array). */
export type GetTopicsData = Topic[]

/** Data type for GET /topics/:topic/posts (array); pagination in envelope. */
export type GetTopicPostsData = FeedPost[]

/** Data type for GET /hashtags/trending (array); pagination in envelope. */
export type GetTrendingHashtagsData = HashtagResult[]

export type NotificationKind = 'comment' | 'boost' | 'follow' | 'mention' | 'generic'

export type NotificationActor = {
  id: string
  username: string | null
  name: string | null
  avatarUrl: string | null
  premium?: boolean
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
  actor: NotificationActor | null
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

export type GetNotificationsData = Notification[]

export type GetNotificationsResponse = {
  data: Notification[]
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

