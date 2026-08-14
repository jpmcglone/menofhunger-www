/** How many verses the feed card shows before collapsing the rest. */
export const SCRIPTURE_PEEK_VERSE_LIMIT = 3

/** Overlay switches from a hugging panel to a scrolling reader at this count. */
export const SCRIPTURE_SCROLLING_READER_MIN_VERSES = 7

export function peekScriptureVerses<T>(
  verses: T[],
  peek: boolean,
  limit = SCRIPTURE_PEEK_VERSE_LIMIT,
): { shown: T[], truncated: boolean, total: number } {
  const total = verses.length
  if (!peek || total <= limit) {
    return { shown: verses, truncated: false, total }
  }
  return { shown: verses.slice(0, limit), truncated: true, total }
}

export function formatScriptureVerseCount(count: number): string {
  return count === 1 ? '1 verse' : `${count} verses`
}

/** Chapter-only refs have no `:` (`Rom 9`, `Psalm 23`). */
export function scriptureReferenceLooksLikeChapter(reference: string): boolean {
  return !reference.includes(':')
}
