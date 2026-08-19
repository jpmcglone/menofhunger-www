/**
 * One rendered row in a thread chain: a real post, or a collapsed run of hidden
 * ancestors. Shared by `FeedPostRow`; kept as a pure/generic function so it's
 * testable without mounting the component or importing API types.
 */
export type ThreadDisplayChainEntry<T> =
  | { kind: 'post'; item: T; index: number }
  | { kind: 'gap'; key: string; hiddenCount: number; hiddenItems: T[] }

/** Matches API `POSTS_RANKING.forYouSeenCollapseHotHours`. */
export const FOR_YOU_SEEN_COLLAPSE_HOT_HOURS = 24
/** Matches API `POSTS_RANKING.forYouSeenCollapseWarmHours`. */
export const FOR_YOU_SEEN_COLLAPSE_WARM_HOURS = 48

export type ThreadSeenAwareItem = {
  id: string
  viewerLastSeenAt?: string | null
}

export type ThreadSeenAwareOpts = {
  /** When true, hide still-warm seen middles (For You only). */
  enabled: boolean
  nowMs?: number
  hotHours?: number
  warmHours?: number
}

function hoursSinceLastSeen(iso: string | null | undefined, nowMs: number): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return null
  return (nowMs - t) / (60 * 60 * 1000)
}

/**
 * Whether a middle post should stay visible under For You seen-aware collapse.
 * Root and leaf are never decided here.
 */
export function shouldShowSeenAwareMiddle<T extends ThreadSeenAwareItem>(
  item: T,
  args: {
    index: number
    lastIndex: number
    chainLength: number
    nowMs: number
    hotHours: number
    warmHours: number
  },
): boolean {
  const hours = hoursSinceLastSeen(item.viewerLastSeenAt, args.nowMs)
  const cooled = hours == null || hours < 0 || hours >= args.warmHours
  const hot = hours != null && hours >= 0 && hours < args.hotHours
  if (hot) return false
  if (cooled) {
    // Fall back to structural keep-set: long chains hide non-parent middles.
    if (args.chainLength <= 3) return true
    return args.index === args.lastIndex - 1
  }
  // Lukewarm (hotHours…warmHours): keep immediate parent; hide other long-chain middles.
  if (args.index === args.lastIndex - 1) return true
  return args.chainLength <= 3
}

/**
 * Compacts `chain` (ordered `[root, …, leaf]`) to root + immediate parent + leaf,
 * plus any post whose id is in `pinnedAncestorIds` (independently surfaced
 * elsewhere in the feed — see `mergeFeedThreadsForDisplay`). Every remaining
 * maximal run of hidden ancestors collapses into one gap entry.
 *
 * When `seenAware.enabled`, For You also hides still-warm seen middles (24h
 * always; 24–48h only on long chains, keeping the immediate parent).
 *
 * Returns every post unchanged when `collapse` is false or the chain is already
 * short enough (<=3) that nothing would be hidden — unless seen-aware hot
 * middles exist on a short chain.
 */
export function buildThreadDisplayChain<T extends ThreadSeenAwareItem>(
  chain: T[],
  pinnedAncestorIds: string[] | undefined,
  collapse: boolean,
  seenAware?: ThreadSeenAwareOpts,
): ThreadDisplayChainEntry<T>[] {
  const seenOn = Boolean(seenAware?.enabled)
  const nowMs = seenAware?.nowMs ?? Date.now()
  const hotHours = seenAware?.hotHours ?? FOR_YOU_SEEN_COLLAPSE_HOT_HOURS
  const warmHours = seenAware?.warmHours ?? FOR_YOU_SEEN_COLLAPSE_WARM_HOURS

  if (!collapse && !seenOn) {
    return chain.map((item, index) => ({ kind: 'post', item, index }))
  }

  const lastIndex = chain.length - 1
  if (lastIndex < 0) return []

  const pinned = new Set(pinnedAncestorIds ?? [])
  const shown = new Set<number>([0, lastIndex])

  if (!seenOn) {
    if (!collapse || chain.length <= 3) {
      return chain.map((item, index) => ({ kind: 'post', item, index }))
    }
    shown.add(lastIndex - 1)
  } else {
    for (let index = 1; index < lastIndex; index++) {
      if (shouldShowSeenAwareMiddle(chain[index]!, {
        index,
        lastIndex,
        chainLength: chain.length,
        nowMs,
        hotHours,
        warmHours,
      })) {
        shown.add(index)
      }
    }
  }

  chain.forEach((item, index) => {
    if (pinned.has(item.id)) shown.add(index)
  })

  if (shown.size === chain.length) {
    return chain.map((item, index) => ({ kind: 'post', item, index }))
  }

  const out: ThreadDisplayChainEntry<T>[] = []
  let index = 0
  while (index <= lastIndex) {
    if (shown.has(index)) {
      out.push({ kind: 'post', item: chain[index]!, index })
      index++
      continue
    }
    let end = index
    while (end <= lastIndex && !shown.has(end)) end++
    out.push({
      kind: 'gap',
      key: `gap-${chain[index]!.id}-${chain[end - 1]!.id}`,
      hiddenCount: end - index,
      hiddenItems: chain.slice(index, end),
    })
    index = end
  }
  return out
}

/** Screen-reader + inline label for a collapsed ancestor gap (one dot per hidden post). */
export function hiddenThreadGapLabel(hiddenCount: number): string {
  const n = Math.max(1, Math.floor(hiddenCount))
  return n === 1 ? '1 reply' : `${n} replies`
}

/** Post rendered immediately below a gap in the display chain (gap tap target). */
export function postAfterGapInDisplayChain<T extends { id: string }>(
  displayChain: ThreadDisplayChainEntry<T>[],
  gapDisplayIndex: number,
): T | null {
  for (let i = gapDisplayIndex + 1; i < displayChain.length; i++) {
    const entry = displayChain[i]
    if (entry?.kind === 'post') return entry.item
  }
  return null
}
