import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function readFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8')
}

describe('word_of_the_day / quote_of_the_day notification wiring', () => {
  it('rowHref routes word_of_the_day to /daily/word', () => {
    const source = readFile('composables/useNotifications.ts')
    expect(source).toContain("n.kind === 'word_of_the_day'")
    expect(source).toContain('/daily/word')
  })

  it('rowHref routes quote_of_the_day to /daily/quote', () => {
    const source = readFile('composables/useNotifications.ts')
    expect(source).toContain("n.kind === 'quote_of_the_day'")
    expect(source).toContain('/daily/quote')
  })

  it('daily content rowHref branches appear before the generic subjectPostId fallback', () => {
    const source = readFile('composables/useNotifications.ts')
    const wordIdx = source.indexOf("n.kind === 'word_of_the_day'")
    const quoteIdx = source.indexOf("n.kind === 'quote_of_the_day'")
    const genericIdx = source.indexOf('n.subjectPostId')
    expect(wordIdx).toBeGreaterThan(0)
    expect(quoteIdx).toBeGreaterThan(0)
    expect(wordIdx).toBeLessThan(genericIdx)
    expect(quoteIdx).toBeLessThan(genericIdx)
  })

  it('notificationIconName has icon for word_of_the_day', () => {
    const source = readFile('composables/useNotifications.ts')
    expect(source).toContain("'tabler:book'")
  })

  it('notificationIconName has icon for quote_of_the_day', () => {
    const source = readFile('composables/useNotifications.ts')
    expect(source).toContain("'tabler:quote'")
  })

  it('markReadByKind is exported from useNotifications', () => {
    const source = readFile('composables/useNotifications.ts')
    expect(source).toContain('markReadByKind')
    // Should be exported in the return object
    expect(source).toMatch(/return\s*\{[^}]*markReadByKind/s)
  })

  it('/daily/word page calls markReadByKind with word_of_the_day', () => {
    const source = readFile('pages/daily/word.vue')
    expect(source).toContain("markReadByKind('word_of_the_day')")
  })

  it('/daily/quote page calls markReadByKind with quote_of_the_day', () => {
    const source = readFile('pages/daily/quote.vue')
    expect(source).toContain("markReadByKind('quote_of_the_day')")
  })

  it('/daily/index page clears both notification kinds', () => {
    const source = readFile('pages/daily/index.vue')
    expect(source).toContain("markReadByKind('word_of_the_day')")
    expect(source).toContain("markReadByKind('quote_of_the_day')")
  })
})
