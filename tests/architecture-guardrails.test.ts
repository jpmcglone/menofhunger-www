import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Ratchet guardrails for modularity and DRY.
 *
 * Known offenders live in tests/architecture-guardrails.baseline.json. New offenders fail;
 * fixed offenders must be removed from the baseline (stale entries fail), so lists only shrink.
 * Regenerate with `UPDATE_GUARDRAIL_BASELINE=1 npx vitest run tests/architecture-guardrails.test.ts`
 * only after fixing offenders, never to admit new ones.
 */

const ROOT = resolve(process.cwd())
const BASELINE_PATH = resolve(ROOT, 'tests/architecture-guardrails.baseline.json')

function walk(dir: string, exts: RegExp, acc: string[] = []): string[] {
  const full = resolve(ROOT, dir)
  let entries: string[] = []
  try { entries = readdirSync(full) } catch { return acc }
  for (const entry of entries) {
    const path = resolve(full, entry)
    if (statSync(path).isDirectory()) walk(relative(ROOT, path), exts, acc)
    else if (exts.test(entry)) acc.push(relative(ROOT, path))
  }
  return acc
}

const SRC_EXT = /\.(ts|vue)$/
const SRC_DIRS = ['components', 'composables', 'layouts', 'middleware', 'pages', 'plugins', 'utils']
const sourceFiles = SRC_DIRS.flatMap((d) => walk(d, SRC_EXT))
const read = (f: string) => readFileSync(resolve(ROOT, f), 'utf8')
const lineCount = (f: string) => read(f).split('\n').length

const MAX_LINES = { pages: 500, components: 600, composables: 600 } as const

function computeOffenders(): Record<string, string[]> {
  const localFormatters: string[] = []
  const undefinedLocale: string[] = []
  const transitionAll: string[] = []
  const pageHandRolledCursor: string[] = []
  const oversized: string[] = []

  for (const file of sourceFiles) {
    const src = read(file)
    if (/function (formatCount|formatDate|formatRelative|timeAgo)\b|const (formatCount|formatDate|formatRelative|timeAgo)\s*=/.test(src)) {
      localFormatters.push(file)
    }
    if (/toLocale(Date|Time)?String\(\s*undefined/.test(src)) undefinedLocale.push(file)
    if (/transition-all|transition:\s*all\b/.test(src)) transitionAll.push(file)
    // Hand-rolled paging = a page or component reading `pagination.nextCursor` off a response itself.
    // Reading a feed composable's `nextCursor` is fine; that composable owns the envelope.
    if ((file.startsWith('pages/') || file.startsWith('components/')) && /pagination\b[^\n;]{0,40}\bnextCursor\b/.test(src)) {
      pageHandRolledCursor.push(file)
    }
    const group = file.split('/')[0] as keyof typeof MAX_LINES
    const max = MAX_LINES[group]
    if (max && lineCount(file) > max) oversized.push(file)
  }

  return {
    localFormatters: localFormatters.sort(),
    undefinedLocaleDates: undefinedLocale.sort(),
    transitionAll: transitionAll.sort(),
    pageHandRolledCursor: pageHandRolledCursor.sort(),
    oversizedFiles: oversized.sort(),
  }
}

const MESSAGES: Record<string, string> = {
  localFormatters: 'Use formatShortCount (utils/text) and utils/time-format instead of local formatters.',
  undefinedLocaleDates: 'Use utils/time-format (fixed en-US) to avoid SSR hydration mismatch.',
  transitionAll: 'Transition explicit properties with --moh-duration/--moh-ease tokens, not `all`.',
  pageHandRolledCursor: 'Use useCursorFeed (or a feature composable) instead of paging inside a page or component.',
  oversizedFiles: 'Keep pages <= 500, components <= 600, composables <= 600 lines; extract composables/sections.',
}

describe('architecture guardrails (ratchet)', () => {
  const current = computeOffenders()
  if (process.env.UPDATE_GUARDRAIL_BASELINE === '1') {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`)
  }
  const baseline: Record<string, string[]> = existsSync(BASELINE_PATH)
    ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
    : {}

  for (const rule of Object.keys(MESSAGES)) {
    it(`${rule}: no new offenders`, () => {
      const allowed = new Set(baseline[rule] ?? [])
      const added = (current[rule] ?? []).filter((f) => !allowed.has(f))
      expect(added, `${MESSAGES[rule]}\n${added.join('\n')}`).toEqual([])
    })
    it(`${rule}: baseline has no stale entries`, () => {
      const now = new Set(current[rule] ?? [])
      const stale = (baseline[rule] ?? []).filter((f) => !now.has(f))
      expect(stale, `Remove fixed files from the baseline:\n${stale.join('\n')}`).toEqual([])
    })
  }
})
