/**
 * One rendered row in a thread chain: a real post, or a collapsed run of hidden
 * ancestors. Shared by `FeedPostRow`; kept as a pure/generic function so it's
 * testable without mounting the component or importing API types.
 */
export type ThreadDisplayChainEntry<T> =
  | { kind: 'post'; item: T; index: number }
  | { kind: 'gap'; key: string; hiddenCount: number }

/**
 * Compacts `chain` (ordered `[root, …, leaf]`) to root + immediate parent + leaf,
 * plus any post whose id is in `pinnedAncestorIds` (independently surfaced
 * elsewhere in the feed — see `mergeFeedThreadsForDisplay`). Every remaining
 * maximal run of hidden ancestors collapses into one gap entry.
 *
 * Returns every post unchanged when `collapse` is false or the chain is already
 * short enough (<=3) that nothing would be hidden.
 */
export function buildThreadDisplayChain<T extends { id: string }>(
  chain: T[],
  pinnedAncestorIds: string[] | undefined,
  collapse: boolean,
): ThreadDisplayChainEntry<T>[] {
  if (!collapse || chain.length <= 3) {
    return chain.map((item, index) => ({ kind: 'post', item, index }))
  }

  const lastIndex = chain.length - 1
  const pinned = new Set(pinnedAncestorIds ?? [])
  const shown = new Set<number>([0, lastIndex, lastIndex - 1])
  chain.forEach((item, index) => {
    if (pinned.has(item.id)) shown.add(index)
  })

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
