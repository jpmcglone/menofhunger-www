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
}

export type PostAuthor = {
  id: string
  username: string | null
  name: string | null
  premium: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarUrl: string | null
}

export type FeedPost = {
  id: string
  createdAt: string
  body: string
  visibility: PostVisibility
  boostCount: number
  media: PostMedia[]
  viewerHasBoosted?: boolean
  internal?: {
    boostScore: number | null
    boostScoreUpdatedAt: string | null
  }
  author: PostAuthor
}

export type GetPostsResponse = {
  posts: FeedPost[]
  nextCursor: string | null
}

export type GetPostResponse = {
  post: FeedPost
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

