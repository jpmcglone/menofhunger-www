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

export type PostVisibility = 'public' | 'verifiedOnly' | 'premiumOnly'

export type PostAuthor = {
  id: string
  username: string | null
  name: string | null
  premium: boolean
  verifiedStatus: 'none' | 'identity' | 'manual'
  avatarKey: string | null
  avatarUpdatedAt: string | null
}

export type FeedPost = {
  id: string
  createdAt: string
  body: string
  visibility: PostVisibility
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

