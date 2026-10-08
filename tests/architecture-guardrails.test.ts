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

const MAX_LINES = { pages: 500, components: 600, composables: 600, layouts: 500, utils: 500 } as const

/** Files allowed to own raw Intl/toLocale formatting (the format utilities themselves). */
const FORMAT_OWNER = /^utils\/(?:[\w-]+-format|eastern-time)\.ts$/
/** Owners of the async-action error toast: the composable itself and the comment-row helper that wraps it. */
const TOAST_CATCH_OWNER = /^composables\/(?:useAsyncAction|useCommentRowActions)\.ts$/

/** True when a `catch` block (or `.catch(` handler) pushes a toast within its first lines. */
function hasToastCatch(src: string): boolean {
  const lines = src.split('\n')
  return lines.some((line, i) => {
    if (!/\bcatch\b\s*(\([^)]*\))?\s*\{\s*$|\.catch\(/.test(line)) return false
    const block = lines.slice(i, i + 8).join('\n')
    const end = block.search(/\n\s*\}\s*(finally|$|\n)/)
    return /toast\.push\(/.test(end > 0 ? block.slice(0, end) : block)
  })
}

const PRESENCE_OWNER = /^composables\/(?:presence\/|usePresence\.ts$)/

function computeOffenders(): Record<string, string[]> {
  const localFormatters: string[] = []
  const undefinedLocale: string[] = []
  const transitionAll: string[] = []
  const pageHandRolledCursor: string[] = []
  const oversized: string[] = []
  const presenceCallbacks: string[] = []
  const adHocFormatting: string[] = []
  const toastCatchPattern: string[] = []

  for (const file of sourceFiles) {
    const src = read(file)
    if (!FORMAT_OWNER.test(file) && /function (formatCount|formatDate|formatRelative|timeAgo)\b|const (formatCount|formatDate|formatRelative|timeAgo)\s*=/.test(src)) {
      localFormatters.push(file)
    }
    if (/toLocale(Date|Time)?String\(\s*undefined/.test(src)) undefinedLocale.push(file)
    if (/transition-all|transition:\s*all\b/.test(src)) transitionAll.push(file)
    // Hand-rolled paging = a page or component reading `pagination.nextCursor` off a response itself.
    // Reading a feed composable's `nextCursor` is fine; that composable owns the envelope.
    if ((file.startsWith('pages/') || file.startsWith('components/')) && /pagination\b[^\n;]{0,40}\bnextCursor\b/.test(src)) {
      pageHandRolledCursor.push(file)
    }
    if (!PRESENCE_OWNER.test(file) && /\b(?:add|remove)[A-Z]\w*Callback\s*\(/.test(src)) presenceCallbacks.push(file)
    if (!FORMAT_OWNER.test(file) && /toLocale(?:Date|Time)?String\(|new Intl\./.test(src)) adHocFormatting.push(file)
    if (!TOAST_CATCH_OWNER.test(file) && hasToastCatch(src)) toastCatchPattern.push(file)
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
    presenceCallbacks: presenceCallbacks.sort(),
    adHocFormatting: adHocFormatting.sort(),
    toastCatchPattern: toastCatchPattern.sort(),
  }
}

const MESSAGES: Record<string, string> = {
  localFormatters: 'Use formatShortCount (utils/text) and utils/time-format instead of local formatters.',
  undefinedLocaleDates: 'Use utils/time-format (fixed en-US) to avoid SSR hydration mismatch.',
  transitionAll: 'Transition explicit properties with --moh-duration/--moh-ease tokens, not `all`.',
  pageHandRolledCursor: 'Use useCursorFeed (or a feature composable) instead of paging inside a page or component.',
  oversizedFiles: 'Keep pages/layouts/utils <= 500, components <= 600, composables <= 600 lines; extract composables/sections.',
  presenceCallbacks: 'Register realtime callbacks with usePresenceCallback (composables/presence/usePresenceCallback.ts). Baselined files are ref-counted singletons or non-component scopes.',
  toastCatchPattern: 'Wrap async actions with useAsyncAction (composables/useAsyncAction.ts) instead of try/catch + toast.push. Baselined files have conditional control flow around the error.',
  adHocFormatting: 'Use utils/number-format and utils/time-format instead of inline toLocale*String / new Intl.*.',
}

/**
 * Remaining oversizedFiles are documented exceptions: their templates alone
 * exceed the page cap, or the SFC is a dense row/player whose next split is a
 * behavior-risk rewrite (PostRow, Header, YouTube player, admin dashboards).
 */

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
