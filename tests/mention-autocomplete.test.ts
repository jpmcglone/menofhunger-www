import { describe, expect, it } from 'vitest'
import {
  extractMentionedUsernames,
  insertMentionAtCaret,
  parseActiveMention,
  segmentBodyWithMentionsDisplay,
  splitTextByMentionsDisplay,
} from '~/utils/mention-autocomplete'

describe('mention-autocomplete utils', () => {
  describe('parseActiveMention', () => {
    it('returns null when caret is at 0', () => {
      expect(parseActiveMention('@a', 0)).toBeNull()
    })

    it('does not activate on bare @ (no query)', () => {
      expect(parseActiveMention('@', 1)).toBeNull()
      expect(parseActiveMention('hello @', 7)).toBeNull()
    })

    it('activates once the first character is typed', () => {
      const res = parseActiveMention('@j', 2)
      expect(res).toMatchObject({ atIndex: 0, caretIndex: 2, raw: 'j', query: 'j', mode: 'username' })
    })

    it('does not treat emails as active mentions', () => {
      const text = 'contact me at foo@bar.com'
      // caret at end of "bar"
      const caret = text.indexOf('bar') + 3
      expect(parseActiveMention(text, caret)).toBeNull()
    })

    it('rejects spaces and newlines inside active token', () => {
      expect(parseActiveMention('@a b', 4)).toBeNull()
      expect(parseActiveMention('@a\nb', 4)).toBeNull()
    })

    it('enforces username prefix rules', () => {
      expect(parseActiveMention('@1', 2)).toBeNull()
      expect(parseActiveMention('@a_', 3)).toMatchObject({ query: 'a_' })
      expect(parseActiveMention('@abcdefghijklmno', 16)).toMatchObject({ query: 'abcdefghijklmno' }) // 15 chars
      expect(parseActiveMention('@abcdefghijklmnop', 17)).toBeNull() // 16 chars
    })
  })

  describe('insertMentionAtCaret', () => {
    it('inserts at the start of an empty draft with a trailing space', () => {
      expect(insertMentionAtCaret('', 0, 'john')).toEqual({ text: '@john ', caret: 6 })
    })

    it('adds a leading space when the caret sits after a word', () => {
      expect(insertMentionAtCaret('hey', 3, 'john')).toEqual({ text: 'hey @john ', caret: 10 })
    })

    it('inserts at the caret in the middle of a draft', () => {
      expect(insertMentionAtCaret('hey  there', 4, 'john')).toEqual({
        text: 'hey @john  there',
        caret: 10,
      })
    })

    it('replaces an in-progress mention token', () => {
      expect(insertMentionAtCaret('hi @jo', 6, 'john')).toEqual({ text: 'hi @john ', caret: 9 })
    })

    it('completes a bare @ at the caret', () => {
      expect(insertMentionAtCaret('hi @', 4, 'john')).toEqual({ text: 'hi @john ', caret: 9 })
    })

    it('does not duplicate an existing mention; caret lands after it', () => {
      expect(insertMentionAtCaret('@john hello', 11, 'john')).toEqual({
        text: '@john hello',
        caret: 6,
      })
    })

    it('ignores invalid usernames', () => {
      expect(insertMentionAtCaret('hey', 3, '1bad')).toEqual({ text: 'hey', caret: 3 })
    })
  })

  describe('extractMentionedUsernames', () => {
    it('extracts unique usernames lowercased', () => {
      expect(extractMentionedUsernames('Hi @John and @john and @JANE')).toEqual(['john', 'jane'])
    })
  })

  describe('segmentBodyWithMentionsDisplay', () => {
    it('does not match email-like @ tokens', () => {
      const segs = segmentBodyWithMentionsDisplay('email foo@bar.com and mention @john')
      expect(segs.map((s) => s.value).join('')).toBe('email foo@bar.com and mention @john')
      expect(segs.some((s) => s.type === 'mention' && s.value === '@bar')).toBe(false)
      expect(segs.some((s) => s.type === 'mention' && s.value === '@john')).toBe(true)
    })
  })

  describe('splitTextByMentionsDisplay', () => {
    it('returns mention matches with lowercased lookup key', () => {
      const segs = splitTextByMentionsDisplay('Hello @John, meet @jane.')
      const mentions = segs.filter((s) => s.mention).map((s) => s.mention!)
      expect(mentions).toEqual([
        { raw: '@John', username: 'John', usernameLower: 'john' },
        { raw: '@jane', username: 'jane', usernameLower: 'jane' },
      ])
    })
  })
})

