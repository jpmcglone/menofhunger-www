type PostChainNode = {
  author?: { id?: string | null } | null
  parent?: PostChainNode | null
  repostedPost?: PostChainNode | null
  quotedPost?: PostChainNode | null
}

/** True when the post, any thread ancestor, or its reposted/quoted post is by one of `authorIds`. */
export function postChainInvolvesAuthor(post: PostChainNode | null | undefined, authorIds: Set<string>): boolean {
  if (!post || authorIds.size === 0) return false
  const authorId = post.author?.id
  if (authorId && authorIds.has(authorId)) return true
  return (
    postChainInvolvesAuthor(post.parent, authorIds)
    || postChainInvolvesAuthor(post.repostedPost, authorIds)
    || postChainInvolvesAuthor(post.quotedPost, authorIds)
  )
}
