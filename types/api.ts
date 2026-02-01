export type ApiEnvelope<T> = { data: T }

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

export type PostVisibility = 'public' | 'verifiedOnly' | 'premiumOnly' | 'onlyMe'

export type PostMediaKind = 'image' | 'gif'
export type PostMediaSource = 'upload' | 'giphy'

export type PostMedia = {
  id: string
  kind: PostMediaKind
  source: PostMediaSource
  url: string
  mp4Url: string | null
  width: number | null
  height: number | null
  deletedAt: string | null
}

export type PostAuthor = {
  id: string
  username: string | null
  name: string | null
  premium: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl: string | null
}

export type PostMention = {
  id: string
  username: string
  verifiedStatus?: 'none' | 'identity' | 'manual'
  premium?: boolean
}

export type FeedPost = {
  id: string
  createdAt: string
  body: string
  visibility: PostVisibility
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

export type SearchBookmarksResponse = {
  bookmarks: Array<{
    bookmarkId: string
    createdAt: string
    collectionIds: string[]
    post: FeedPost
  }>
  nextCursor: string | null
}

export type GetPostsResponse = {
  posts: FeedPost[]
  nextCursor: string | null
}

export type GetPostResponse = {
  post: FeedPost
}

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

export type GetThreadParticipantsResponse = {
  participants: Array<{ id: string; username: string }>
}

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
  lastModified: string
  publicUrl: string | null
  deletedAt: string | null
  belongsToSummary: 'post' | 'user' | 'orphan'
}

export type AdminImageReviewListResponse = {
  items: AdminImageReviewListItem[]
  nextCursor: string | null
}

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

export type CreatePostResponse = {
  post: FeedPost
}

export type GiphySearchResponse = {
  items: Array<{
    id: string
    title: string
    url: string
    mp4Url: string | null
    width: number | null
    height: number | null
  }>
}

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
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl: string | null
  relationship: FollowRelationship
}

export type GetFollowsListResponse = {
  users: FollowListUser[]
  nextCursor: string | null
}

export type OnlineUser = FollowListUser & { lastConnectAt?: number }

export type GetPresenceOnlineResponse = {
  users: OnlineUser[]
  totalOnline?: number
}

