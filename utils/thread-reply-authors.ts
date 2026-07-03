import type { FeedPost, PostAuthor } from '~/types/api'

export type ReplyAuthorPreview = Pick<
  PostAuthor,
  'id' | 'username' | 'name' | 'avatarUrl' | 'isOrganization'
>

const MAX_REPLY_FACEPILE = 5

/** Unique authors in first-seen order (for overlapping reply facepiles). */
export function uniqueReplyAuthorsFromPosts(
  posts: Array<{ author?: PostAuthor | null }>,
  max = MAX_REPLY_FACEPILE,
): ReplyAuthorPreview[] {
  const seen = new Set<string>()
  const out: ReplyAuthorPreview[] = []
  for (const post of posts) {
    const author = post.author
    if (!author) continue
    const id = author.id?.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push({
      id,
      username: author.username,
      name: author.name,
      avatarUrl: author.avatarUrl,
      isOrganization: author.isOrganization,
    })
    if (out.length >= max) break
  }
  return out
}

export function mergeReplyAuthorPreviews(
  ...lists: Array<ReplyAuthorPreview[] | undefined | null>
): ReplyAuthorPreview[] {
  const seen = new Set<string>()
  const out: ReplyAuthorPreview[] = []
  for (const list of lists) {
    for (const author of list ?? []) {
      const id = author.id?.trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(author)
      if (out.length >= MAX_REPLY_FACEPILE) return out
    }
  }
  return out
}

export function replyAuthorsFromFeedPost(post: FeedPost): ReplyAuthorPreview[] {
  return mergeReplyAuthorPreviews(
    post.threadCollapsedAuthors?.map((author) => ({
      id: author.id,
      username: author.username,
      name: author.name,
      avatarUrl: author.avatarUrl,
      isOrganization: author.isOrganization,
    })),
  )
}
