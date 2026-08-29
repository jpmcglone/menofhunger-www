import type { FeedPost } from '~/types/api'

/**
 * One-shot seeds for `/p/:id` so a toast tap can paint the post we just created
 * (and the parent we replied to) before GET /posts/:id walks the ancestor chain.
 */
const seeds = new Map<string, FeedPost>()

export function seedPermalinkPost(post: FeedPost, parent?: FeedPost | null): FeedPost {
  const seeded: FeedPost =
    post.parent || !parent
      ? post
      : { ...post, parent, parentId: post.parentId ?? parent.id }
  if (seeded.id) seeds.set(seeded.id, seeded)
  return seeded
}

export function peekPermalinkSeed(id: string): FeedPost | undefined {
  return seeds.get(id)
}

export function consumePermalinkSeed(id: string): FeedPost | undefined {
  const post = seeds.get(id)
  if (post) seeds.delete(id)
  return post
}

export function clearPermalinkSeeds(): void {
  seeds.clear()
}
