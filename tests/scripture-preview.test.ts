import { describe, expect, it } from 'vitest'
import {
  SCRIPTURE_PEEK_VERSE_LIMIT,
  formatScriptureVerseCount,
  peekScriptureVerses,
  scriptureReferenceLooksLikeChapter,
} from '../utils/scripture-preview'

describe('scripture preview helpers', () => {
  it('keeps short passages intact in peek mode', () => {
    const verses = [{ n: 16 }, { n: 17 }]
    expect(peekScriptureVerses(verses, true)).toEqual({
      shown: verses,
      truncated: false,
      total: 2,
    })
  })

  it('caps peek at three verses and reports the full count', () => {
    const verses = [1, 2, 3, 4, 5]
    expect(peekScriptureVerses(verses, true)).toEqual({
      shown: [1, 2, 3],
      truncated: true,
      total: 5,
    })
    expect(SCRIPTURE_PEEK_VERSE_LIMIT).toBe(3)
  })

  it('does not cap when peek is off', () => {
    const verses = [1, 2, 3, 4, 5]
    expect(peekScriptureVerses(verses, false).shown).toEqual(verses)
    expect(peekScriptureVerses(verses, false).truncated).toBe(false)
  })

  it('formats verse counts for the peek footer', () => {
    expect(formatScriptureVerseCount(1)).toBe('1 verse')
    expect(formatScriptureVerseCount(33)).toBe('33 verses')
  })

  it('treats missing colons as chapter-only references', () => {
    expect(scriptureReferenceLooksLikeChapter('Romans 9')).toBe(true)
    expect(scriptureReferenceLooksLikeChapter('Psalm 23')).toBe(true)
    expect(scriptureReferenceLooksLikeChapter('John 3:16')).toBe(false)
    expect(scriptureReferenceLooksLikeChapter('Eph 2:1,8')).toBe(false)
  })
})
