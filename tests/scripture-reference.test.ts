import { describe, expect, it } from 'vitest'
import { splitTextByScriptureDisplay } from '../utils/scripture-reference'

function scriptureRefs(text: string): string[] {
  return splitTextByScriptureDisplay(text)
    .filter(s => s.scripture)
    .map(s => s.scripture!.reference)
}

describe('splitTextByScriptureDisplay', () => {
  it('highlights a canonical verse', () => {
    expect(scriptureRefs('John 3:16 is well known')).toEqual(['John 3:16'])
  })

  it('highlights comma-separated verses in one chapter', () => {
    expect(scriptureRefs('Eph 2:1,8')).toEqual(['Ephesians 2:1,8'])
  })

  it('highlights chapter-only abbreviations like Rom 9', () => {
    expect(scriptureRefs('see Rom 9 for election')).toEqual(['Romans 9'])
  })

  it('highlights every ref in a citation list including chapter-only Rom 9', () => {
    expect(scriptureRefs('(Eph 2:1,8; John 6:44; Acts 13:48; Rom 9)')).toEqual([
      'Ephesians 2:1,8',
      'John 6:44',
      'Acts 13:48',
      'Romans 9',
    ])
  })

  it('keeps the original token text while canonicalizing the lookup key', () => {
    const segs = splitTextByScriptureDisplay('see Rom 9 now')
    const hit = segs.find(s => s.scripture)
    expect(hit?.text).toBe('Rom 9')
    expect(hit?.scripture?.reference).toBe('Romans 9')
  })

  it('highlights Psalm 23 as a whole-psalm citation', () => {
    expect(scriptureRefs('Pray Psalm 23')).toEqual(['Psalms 23'])
  })

  it('matches a period after the book abbreviation', () => {
    expect(scriptureRefs('Rom. 8:28')).toEqual(['Romans 8:28'])
  })

  it('does not highlight ambiguous name + number in running prose', () => {
    expect(scriptureRefs('Job 1')).toEqual([])
    expect(scriptureRefs('John 3 is coming over')).toEqual([])
  })

  it('does highlight ambiguous names in a citation list', () => {
    expect(scriptureRefs('(Job 1; John 3)')).toEqual(['Job 1', 'John 3'])
  })

  it('does not treat rejected chapter-only matches as missing text', () => {
    const segs = splitTextByScriptureDisplay('Job 1 happened')
    expect(segs.map(s => s.text).join('')).toBe('Job 1 happened')
    expect(scriptureRefs('Job 1 happened')).toEqual([])
  })

  it('does not match Amos via the am alias in ordinary prose', () => {
    expect(scriptureRefs('I am 1 year in')).toEqual([])
  })
})
