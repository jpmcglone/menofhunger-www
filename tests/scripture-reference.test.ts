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

describe('scripture reference boundaries', () => {
  it('preserves every reference and separator in the reported bulleted reply', () => {
    const text = 'Joshua 1:9 is the clearest match. Also fitting:\n\n'
      + '- Deuteronomy 31:6\n- 1 Corinthians 16:13\n- Ephesians 6:10\n- 2 Timothy 1:7'
      + '\n\nJoshua 1:9 directly commands strength and courage.'
    const segments = splitTextByScriptureDisplay(text)
    const expected = ['Joshua 1:9', 'Deuteronomy 31:6', '1 Corinthians 16:13', 'Ephesians 6:10', '2 Timothy 1:7', 'Joshua 1:9']
    expect(scriptureRefs(text)).toEqual(expected)
    expect(segments.filter(s => s.scripture).map(s => s.text)).toEqual(expected)
    expect(segments.map(s => s.text).join('')).toBe(text)
  })

  it.each(['\n', '\r\n', '\r', '\u0085', '\u2028', '\u2029'])('keeps references on separate lines (%j)', (newline) => {
    for (const bullet of ['', '- ', '– ', '— ']) {
      const text = `Deuteronomy 31:6${newline}${bullet}1 Corinthians 16:13`
      expect(scriptureRefs(text)).toEqual(['Deuteronomy 31:6', '1 Corinthians 16:13'])
      expect(splitTextByScriptureDisplay(text).filter(s => s.scripture).map(s => s.text))
        .toEqual(['Deuteronomy 31:6', '1 Corinthians 16:13'])
    }
    expect(scriptureRefs(`Romans${newline}9`)).toEqual([])
    expect(scriptureRefs(`John 3:16 -${newline}18`)).toEqual(['John 3:16'])
    expect(scriptureRefs(`John 3:16,${newline}18`)).toEqual(['John 3:16'])
  })

  it.each([' - ', ' – ', ' — ', ', '])('keeps a following numbered book separate (%s)', (separator) => {
    expect(scriptureRefs(`John 3:16${separator}1 Corinthians 16:13${separator}2 Tim. 1:7`))
      .toEqual(['John 3:16', '1 Corinthians 16:13', '2 Timothy 1:7'])
  })

  it.each(['-', '–', '—'])('preserves real verse ranges with %s', (dash) => {
    const text = `1 Cor. 13:4 \t${dash}\u00a07, 9${dash}12 encourages love.`
    expect(scriptureRefs(text)).toEqual(['1 Corinthians 13:4-7,9-12'])
    expect(splitTextByScriptureDisplay(text).map(s => s.text).join('')).toBe(text)
  })
})
