/**
 * Catches Tailwind v3 utilities that were REMOVED in v4.
 *
 * These fail silently and are the worst kind of styling bug: Tailwind emits no rule
 * at all, the build succeeds, ESLint says nothing, and the element just renders with
 * the un-modified base utility.
 *
 * The regression that prompted this: chat reaction pills used
 * `bg-[var(--p-primary-color)] bg-opacity-10 text-[var(--p-primary-color)]`. In v4
 * `bg-opacity-10` compiles to nothing, so the pill got a SOLID primary background
 * behind primary-colored text — the reaction count was rendered orange-on-orange and
 * looked like dead space inside the pill.
 *
 * The v4 replacement is the slash opacity modifier, which works on arbitrary
 * `var()` colors and compiles to `color-mix(...)` with a solid fallback:
 *
 *   bg-[var(--x)] bg-opacity-10   ✗ emits nothing
 *   bg-[var(--x)]/10              ✓ color-mix(in oklab, var(--x) 10%, transparent)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const SCAN_DIRS = ['components', 'pages', 'layouts', 'composables', 'plugins', 'utils', 'app.vue', 'error.vue']
const SCAN_EXTENSIONS = new Set(['.vue', '.ts', '.css'])

/** Utilities removed in Tailwind v4 that silently compile to nothing. */
const REMOVED_UTILITIES = [
  'bg-opacity',
  'text-opacity',
  'border-opacity',
  'ring-opacity',
  'divide-opacity',
  'placeholder-opacity',
]

const REMOVED_PATTERN = new RegExp(`\\b(?:${REMOVED_UTILITIES.join('|')})-\\d+`, 'g')

function collectFiles(entry: string, out: string[] = []): string[] {
  const abs = resolve(ROOT, entry)
  let stat
  try {
    stat = statSync(abs)
  } catch {
    return out
  }
  if (stat.isFile()) {
    if (SCAN_EXTENSIONS.has(extname(abs))) out.push(abs)
    return out
  }
  for (const child of readdirSync(abs)) {
    if (child === 'node_modules' || child.startsWith('.')) continue
    collectFiles(join(entry, child), out)
  }
  return out
}

describe('tailwind v4 utilities', () => {
  it('uses the slash opacity modifier instead of v3 *-opacity-* utilities', () => {
    const offenders: string[] = []

    for (const dir of SCAN_DIRS) {
      for (const file of collectFiles(dir)) {
        const source = readFileSync(file, 'utf8')
        for (const match of source.matchAll(REMOVED_PATTERN)) {
          const line = source.slice(0, match.index).split('\n').length
          offenders.push(`${relative(ROOT, file)}:${line} — ${match[0]}`)
        }
      }
    }

    expect(offenders, `Removed in Tailwind v4; these compile to nothing. Use \`bg-[var(--x)]/10\` style modifiers instead.\n${offenders.join('\n')}`).toEqual([])
  })
})
