import type { FeedPost } from '~/types/api'

export type LocalFeedInsert =
  | { kind: 'prepend'; post: FeedPost }
  | { kind: 'replaceParent'; post: FeedPost; parentId: string }


export function upsertLocalFeedInsert(inserts: LocalFeedInsert[], nextInsert: LocalFeedInsert): LocalFeedInsert[] {
  const nextId = (nextInsert.post.id ?? '').trim()
  if (!nextId) return inserts
  const withoutSameId = inserts.filter((it) => (it.post.id ?? '').trim() !== nextId)
  return [...withoutSameId, nextInsert]
}

export function removeLocalFeedInsertsForDeletedPost(inserts: LocalFeedInsert[], postId: string): LocalFeedInsert[] {
  const pid = (postId ?? '').trim()
  if (!pid) return inserts
  return inserts.filter((it) => {
    if ((it.post.id ?? '').trim() === pid) return false
    if (it.kind === 'replaceParent' && (it.parentId ?? '').trim() === pid) return false
    return true
  })
}

export function patchLocalFeedInsertPost(inserts: LocalFeedInsert[], updated: FeedPost): LocalFeedInsert[] {
  const pid = (updated?.id ?? '').trim()
  if (!pid) return inserts
  return inserts.map((it) => {
    if ((it.post.id ?? '').trim() !== pid) return it
    if (it.kind === 'prepend') return { kind: 'prepend', post: { ...updated } }
    return { kind: 'replaceParent', parentId: it.parentId, post: { ...updated } }
  })
}

export function pruneAckedLocalFeedInserts(inserts: LocalFeedInsert[], incoming: FeedPost[]): LocalFeedInsert[] {
  const incomingIds = new Set(incoming.map((p) => (p.id ?? '').trim()).filter(Boolean))
  if (!incomingIds.size) return inserts
  return inserts.filter((it) => !incomingIds.has((it.post.id ?? '').trim()))
}

/**
 * Cross-page repost deduplication for loadMore appends.
 *
 * When page N is appended to the already-loaded pages:
 *   1. Drop a standalone post from `incoming` if the existing feed already shows it
 *      embedded as `repostedPost` inside a repost shell (the content is already visible).
 *   2. Drop a repost shell from `incoming` if the existing feed already has its
 *      `repostedPost.id` as a standalone top-level row (reverse case).
 */
export function dedupeIncomingPageWithExisting(incoming: FeedPost[], existing: FeedPost[]): FeedPost[] {
  // IDs of originals already embedded inside a repost row in the current feed.
  const embeddedOriginalIds = new Set<string>()
  // Top-level post IDs already in the feed.
  const existingTopLevelIds = new Set<string>()
  for (const p of existing) {
    const pid = (p.id ?? '').trim()
    if (pid) existingTopLevelIds.add(pid)
    const repostedId = ((p as { repostedPost?: { id?: string } }).repostedPost?.id ?? '').trim()
    if (repostedId) embeddedOriginalIds.add(repostedId)
  }

  return incoming.filter((p) => {
    const pid = (p.id ?? '').trim()
    // Case 1: standalone post already visible as an embedded original.
    if (pid && embeddedOriginalIds.has(pid)) return false
    // Case 2: repost shell whose original is already a top-level row.
    const repostedId = ((p as { repostedPost?: { id?: string } }).repostedPost?.id ?? '').trim()
    if (repostedId && existingTopLevelIds.has(repostedId)) return false
    return true
  })
}

export function applyLocalFeedInserts(incoming: FeedPost[], inserts: LocalFeedInsert[]): FeedPost[] {
  if (!inserts.length) return incoming.length ? [...incoming] : []
  const out = incoming.length ? [...incoming] : []
  const seen = new Set(out.map((p) => (p.id ?? '').trim()).filter(Boolean))

  for (const insert of inserts) {
    const postId = (insert.post.id ?? '').trim()
    if (!postId || seen.has(postId)) continue

    if (insert.kind === 'prepend') {
      out.unshift(insert.post)
      seen.add(postId)
      continue
    }

    const parentId = (insert.parentId ?? '').trim()
    const idx = parentId ? out.findIndex((p) => (p.id ?? '').trim() === parentId) : -1
    if (idx >= 0) {
      out[idx] = insert.post
    } else {
      // If parent isn't in this page yet, keep reply visible near the top.
      out.unshift(insert.post)
    }
    seen.add(postId)
  }

  return out
}
