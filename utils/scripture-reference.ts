/**
 * Scripture reference parsing for display — mirrors
 * `menofhunger-api/src/common/scripture/scripture-reference.ts`.
 *
 * Matches `Book Chapter:Verse` with optional verse range (e.g. `John 3:16`,
 * `1 Cor 13:4-7`). Chapter-only refs (`Genesis 1`) are not matched.
 *
 * Book table kept in sync with:
 * - `menofhunger-api/src/common/scripture/scripture-reference.ts`
 * - `menofhunger-ios/MenOfHunger/Domain/Shared/Text/ScriptureReferenceParser.swift`
 */

type BookEntry = {
  name: string
  aliases: string[]
  apiId: string
}

export const BOOKS: BookEntry[] = [
  // ── Old Testament ──────────────────────────────────────────────────────────
  { name: 'Genesis',          aliases: ['gen', 'ge'],                                  apiId: 'GEN' },
  { name: 'Exodus',           aliases: ['exod', 'exo', 'ex'],                          apiId: 'EXO' },
  { name: 'Leviticus',        aliases: ['lev', 'le'],                                  apiId: 'LEV' },
  { name: 'Numbers',          aliases: ['num', 'nu', 'nm'],                            apiId: 'NUM' },
  { name: 'Deuteronomy',      aliases: ['deut', 'deu', 'dt'],                          apiId: 'DEU' },
  { name: 'Joshua',           aliases: ['josh', 'jos'],                                apiId: 'JOS' },
  { name: 'Judges',           aliases: ['judg', 'jdg'],                                apiId: 'JDG' },
  { name: 'Ruth',             aliases: ['ru'],                                         apiId: 'RUT' },
  { name: '1 Samuel',         aliases: ['1 sam', '1sam', '1sa'],                       apiId: '1SA' },
  { name: '2 Samuel',         aliases: ['2 sam', '2sam', '2sa'],                       apiId: '2SA' },
  { name: '1 Kings',          aliases: ['1 kgs', '1kgs', '1ki'],                       apiId: '1KI' },
  { name: '2 Kings',          aliases: ['2 kgs', '2kgs', '2ki'],                       apiId: '2KI' },
  { name: '1 Chronicles',     aliases: ['1 chron', '1chron', '1 chr', '1chr', '1ch'], apiId: '1CH' },
  { name: '2 Chronicles',     aliases: ['2 chron', '2chron', '2 chr', '2chr', '2ch'], apiId: '2CH' },
  { name: 'Ezra',             aliases: ['ezr'],                                        apiId: 'EZR' },
  { name: 'Nehemiah',         aliases: ['neh', 'ne'],                                  apiId: 'NEH' },
  { name: 'Esther',           aliases: ['esth', 'est'],                                apiId: 'EST' },
  { name: 'Job',              aliases: [],                                             apiId: 'JOB' },
  { name: 'Psalms',           aliases: ['psalm', 'psa', 'ps'],                         apiId: 'PSA' },
  { name: 'Proverbs',         aliases: ['prov', 'pro', 'pr'],                          apiId: 'PRO' },
  { name: 'Ecclesiastes',     aliases: ['eccl', 'ecc', 'qoh'],                         apiId: 'ECC' },
  { name: 'Song of Solomon',  aliases: ['song', 'sos', 'ss', 'cant'],                  apiId: 'SNG' },
  { name: 'Isaiah',           aliases: ['isa'],                                        apiId: 'ISA' },
  { name: 'Jeremiah',         aliases: ['jer', 'je'],                                  apiId: 'JER' },
  { name: 'Lamentations',     aliases: ['lam', 'la'],                                  apiId: 'LAM' },
  { name: 'Ezekiel',          aliases: ['ezek', 'eze'],                                apiId: 'EZK' },
  { name: 'Daniel',           aliases: ['dan', 'da'],                                  apiId: 'DAN' },
  { name: 'Hosea',            aliases: ['hos', 'ho'],                                  apiId: 'HOS' },
  { name: 'Joel',             aliases: [],                                             apiId: 'JOL' },
  { name: 'Amos',             aliases: ['am'],                                         apiId: 'AMO' },
  { name: 'Obadiah',          aliases: ['obad', 'ob'],                                 apiId: 'OBA' },
  { name: 'Jonah',            aliases: ['jon'],                                        apiId: 'JON' },
  { name: 'Micah',            aliases: ['mic', 'mi'],                                  apiId: 'MIC' },
  { name: 'Nahum',            aliases: ['nah', 'na'],                                  apiId: 'NAM' },
  { name: 'Habakkuk',         aliases: ['hab'],                                        apiId: 'HAB' },
  { name: 'Zephaniah',        aliases: ['zeph', 'zep'],                                apiId: 'ZEP' },
  { name: 'Haggai',           aliases: ['hag'],                                        apiId: 'HAG' },
  { name: 'Zechariah',        aliases: ['zech', 'zec'],                                apiId: 'ZEC' },
  { name: 'Malachi',          aliases: ['mal'],                                        apiId: 'MAL' },
  // ── New Testament ──────────────────────────────────────────────────────────
  { name: 'Matthew',          aliases: ['matt', 'mt'],                                 apiId: 'MAT' },
  { name: 'Mark',             aliases: ['mk', 'mc'],                                   apiId: 'MRK' },
  { name: 'Luke',             aliases: ['lk'],                                         apiId: 'LUK' },
  { name: 'John',             aliases: ['jn', 'jhn'],                                  apiId: 'JHN' },
  { name: 'Acts',             aliases: ['ac'],                                          apiId: 'ACT' },
  { name: 'Romans',           aliases: ['rom', 'ro', 'rm'],                            apiId: 'ROM' },
  { name: '1 Corinthians',    aliases: ['1 cor', '1cor', '1co'],                       apiId: '1CO' },
  { name: '2 Corinthians',    aliases: ['2 cor', '2cor', '2co'],                       apiId: '2CO' },
  { name: 'Galatians',        aliases: ['gal', 'ga'],                                  apiId: 'GAL' },
  { name: 'Ephesians',        aliases: ['eph'],                                        apiId: 'EPH' },
  { name: 'Philippians',      aliases: ['phil', 'php', 'pp'],                          apiId: 'PHP' },
  { name: 'Colossians',       aliases: ['col'],                                        apiId: 'COL' },
  { name: '1 Thessalonians',  aliases: ['1 thess', '1thess', '1th'],                   apiId: '1TH' },
  { name: '2 Thessalonians',  aliases: ['2 thess', '2thess', '2th'],                   apiId: '2TH' },
  { name: '1 Timothy',        aliases: ['1 tim', '1tim', '1ti'],                       apiId: '1TI' },
  { name: '2 Timothy',        aliases: ['2 tim', '2tim', '2ti'],                       apiId: '2TI' },
  { name: 'Titus',            aliases: ['tit'],                                        apiId: 'TIT' },
  { name: 'Philemon',         aliases: ['philem', 'phlm', 'phm'],                      apiId: 'PHM' },
  { name: 'Hebrews',          aliases: ['heb'],                                        apiId: 'HEB' },
  { name: 'James',            aliases: ['jas', 'jm'],                                  apiId: 'JAS' },
  { name: '1 Peter',          aliases: ['1 pet', '1pet', '1pe'],                       apiId: '1PE' },
  { name: '2 Peter',          aliases: ['2 pet', '2pet', '2pe'],                       apiId: '2PE' },
  { name: '1 John',           aliases: ['1 john', '1john', '1jn', '1jo'],              apiId: '1JN' },
  { name: '2 John',           aliases: ['2 john', '2john', '2jn', '2jo'],              apiId: '2JN' },
  { name: '3 John',           aliases: ['3 john', '3john', '3jn', '3jo'],              apiId: '3JN' },
  { name: 'Jude',             aliases: ['jud'],                                        apiId: 'JUD' },
  { name: 'Revelation',       aliases: ['rev', 're'],                                  apiId: 'REV' },
]

// ─── Lookup map ──────────────────────────────────────────────────────────────

const _bookLookup = new Map<string, BookEntry>()
for (const book of BOOKS) {
  _bookLookup.set(book.name.toLowerCase(), book)
  for (const alias of book.aliases) {
    _bookLookup.set(alias.toLowerCase(), book)
  }
}

function regexEsc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildBookPattern(): string {
  const parts: string[] = []
  for (const book of BOOKS) {
    parts.push(regexEsc(book.name))
    for (const alias of book.aliases) {
      parts.push(regexEsc(alias))
    }
  }
  parts.sort((a, b) => b.length - a.length || a.localeCompare(b))
  return parts.join('|')
}

const BOOK_ALT = buildBookPattern()

export const SCRIPTURE_IN_TEXT_RE = new RegExp(
  `(?<![A-Za-z0-9])(${BOOK_ALT})\\s+(\\d{1,3}):(\\d{1,3})(?:-(\\d{1,3}))?(?![A-Za-z])`,
  'gi',
)

// ─── Splitter ────────────────────────────────────────────────────────────────

export type ScriptureSegment = {
  text: string
  scripture?: { reference: string }
}

/** Split text into plain segments and tappable scripture reference tokens. */
export function splitTextByScriptureDisplay(text: string): ScriptureSegment[] {
  const value = (text ?? '').toString()
  if (!value) return []
  const re = new RegExp(SCRIPTURE_IN_TEXT_RE.source, SCRIPTURE_IN_TEXT_RE.flags)
  const out: ScriptureSegment[] = []
  let lastEnd = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(value))) {
    const raw = m[0] ?? ''
    const bookStr = m[1] ?? ''
    const chapter = parseInt(m[2] ?? '0', 10)
    const verseStart = parseInt(m[3] ?? '0', 10)
    const verseEnd = m[4] !== undefined ? parseInt(m[4], 10) : null
    const start = m.index

    if (start > lastEnd) out.push({ text: value.slice(lastEnd, start) })

    const entry = _bookLookup.get(bookStr.trim().toLowerCase())
    if (entry) {
      const suffix = verseEnd !== null ? `-${verseEnd}` : ''
      const reference = `${entry.name} ${chapter}:${verseStart}${suffix}`
      out.push({ text: raw, scripture: { reference } })
    } else {
      out.push({ text: raw })
    }

    lastEnd = start + raw.length
  }
  if (lastEnd < value.length) out.push({ text: value.slice(lastEnd) })
  return out.length ? out : [{ text: value }]
}
