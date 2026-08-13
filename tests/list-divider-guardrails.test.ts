import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * List row separators must use `moh-divide` (`--moh-border-subtle`).
 *
 * Tailwind `divide-y` without a divide-* color uses currentColor. In dark mode
 * that is near-white text, so every row gets a high-contrast white line.
 * `moh-border` on the parent does not color those child borders.
 */

const ROOT = process.cwd()
const SCAN_DIRS = ['components', 'pages', 'layouts', 'composables', 'plugins', 'utils', 'assets', 'app.vue', 'error.vue']
const SCAN_EXTENSIONS = new Set(['.vue', '.ts', '.css'])

const BANNED = /\bdivide-(?:y|x|gray-|zinc-|white|slate-|neutral-|\[)/g

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

function isCommentLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return true
  return (
    trimmed.startsWith('//')
    || trimmed.startsWith('*')
    || trimmed.startsWith('/*')
    || trimmed.startsWith('<!--')
  )
}

describe('list divider guardrails', () => {
  it('defines moh-divide against --moh-border-subtle', () => {
    const css = readFileSync(resolve(ROOT, 'assets/css/main.css'), 'utf8')
    expect(css).toContain('.moh-divide > :not([hidden]) ~ :not([hidden])')
    expect(css).toMatch(/\.moh-divide[\s\S]{0,200}border-color:\s*var\(--moh-border-subtle\)/)
  })

  it('does not use Tailwind divide-* for list separators', () => {
    const offenders: string[] = []

    for (const dir of SCAN_DIRS) {
      for (const file of collectFiles(dir)) {
        const rel = relative(ROOT, file)
        // Defines moh-divide + documents the anti-pattern. Don't scan it for divide-*.
        if (rel === 'assets/css/main.css') continue
        const source = readFileSync(file, 'utf8')
        const lines = source.split('\n')
        for (const [i, line] of lines.entries()) {
          if (line === undefined || isCommentLine(line)) continue
          BANNED.lastIndex = 0
          const match = BANNED.exec(line)
          if (match) {
            offenders.push(`${rel}:${i + 1} — ${match[0]}`)
          }
        }
      }
    }

    expect(
      offenders,
      `Use \`moh-divide\` instead of Tailwind divide-*. Bare divide-y uses currentColor (white lines in dark mode).\n${offenders.join('\n')}`,
    ).toEqual([])
  })
})
