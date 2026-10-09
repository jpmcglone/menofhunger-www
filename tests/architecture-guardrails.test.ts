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

const MAX_LINES = { pages: 400, components: 400, composables: 400, layouts: 400, utils: 400 } as const

/** Files allowed to own raw Intl/toLocale formatting (the format utilities themselves). */
const FORMAT_OWNER = /^utils\/(?:[\w-]+-format|eastern-time)\.ts$/
/** Owners of the async-action error toast: the composable itself and the comment-row helper that wraps it. */
const TOAST_CATCH_OWNER = /^composables\/(?:useAsyncAction|useCommentRowActions)\.ts$/

/** Text between the bracket at `open` and its matching close (naive: ignores brackets inside strings). */
function balancedBody(src: string, open: number, openCh: string, closeCh: string): string {
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === openCh) depth++
    else if (src[i] === closeCh && --depth === 0) return src.slice(open, i)
  }
  return src.slice(open)
}

/** True when any `catch { }` block or `.catch(...)` handler, of any length, pushes a toast. */
function hasToastCatch(src: string): boolean {
  for (const m of src.matchAll(/\bcatch\b\s*(?:\([^)]*\))?\s*\{/g)) {
    if (/toast\.push\(/.test(balancedBody(src, m.index + m[0].length - 1, '{', '}'))) return true
  }
  for (const m of src.matchAll(/\.catch\(/g)) {
    if (/toast\.push\(/.test(balancedBody(src, m.index + m[0].length - 1, '(', ')'))) return true
  }
  return false
}

/** Link-preview cards share one anchor shell (ExternalLinkCard) for rel, target, and the leave-site confirmation. */
const LINK_CARD_FILE = /^components\/app\/content\/[\w-]*(?:Card|Preview)\w*\.vue$/

/** Explicit `any` outside comments and lines carrying an eslint-disable reason. */
function hasExplicitAny(src: string): boolean {
  return src.split('\n').some((line) => {
    const t = line.trim()
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || /eslint-disable/.test(line)) return false
    return /(?::\s*any\b|\bas any\b|<any[,>\[]|\bany\[\]|Record<string,\s*any>)/.test(line)
  })
}

/** The only file allowed to issue a raw presigned-URL `PUT` (retries + friendly 403 message). */
const PRESIGNED_PUT_OWNER = 'utils/put-presigned-file.ts'
/** Shared homes for tiny utilities; local redefinitions drift (clamp/sleep/isRecord/initials/formatBytes). */
const UTILITY_OWNER = /^utils\/(?:primitives|text|number-format)\.ts$/
const LOCAL_UTILITY = /(?:\bfunction\s+|\b(?:const|let)\s+)(?:clamp|sleep|isRecord|initials|formatBytes|getInitials)\b\s*(?:\(|=\s*(?:\(|async|computed))/

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
  const externalLinkShell: string[] = []
  const explicitAny: string[] = []
  const rawPresignedPut: string[] = []
  const duplicatedUtilities: string[] = []

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
    if (LINK_CARD_FILE.test(file) && file !== 'components/app/content/ExternalLinkCard.vue' && /target="_blank"|confirmExternal/.test(src)) externalLinkShell.push(file)
    if (hasExplicitAny(src)) explicitAny.push(file)
    if (file !== PRESIGNED_PUT_OWNER && /(?<![\w.])fetch\(\s*[\w.?]*[uU]ploadUrl/.test(src)) rawPresignedPut.push(file)
    if (!UTILITY_OWNER.test(file) && LOCAL_UTILITY.test(src)) duplicatedUtilities.push(file)
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
    externalLinkShell: externalLinkShell.sort(),
    explicitAny: explicitAny.sort(),
    rawPresignedPut: rawPresignedPut.sort(),
    duplicatedUtilities: duplicatedUtilities.sort(),
  }
}

const MESSAGES: Record<string, string> = {
  localFormatters: 'Use formatShortCount (utils/text) and utils/time-format instead of local formatters.',
  undefinedLocaleDates: 'Use utils/time-format (fixed en-US) to avoid SSR hydration mismatch.',
  transitionAll: 'Transition explicit properties with --moh-duration/--moh-ease tokens, not `all`.',
  pageHandRolledCursor: 'Use useCursorFeed (or a feature composable) instead of paging inside a page or component.',
  oversizedFiles: 'Keep source files <= 400 lines; extract composables/sections. Baselined files are the remaining splits and may not grow past the baseline.',
  presenceCallbacks: 'Register realtime callbacks with usePresenceCallback (composables/presence/usePresenceCallback.ts). Baselined files are ref-counted singletons or non-component scopes.',
  toastCatchPattern: 'Wrap async actions with useAsyncAction (composables/useAsyncAction.ts) instead of try/catch + toast.push. Baselined files have conditional control flow around the error.',
  externalLinkShell: 'Render link-preview cards inside AppExternalLinkCard (components/app/content/ExternalLinkCard.vue) instead of hand-rolling target="_blank" and the external-link confirmation.',
  explicitAny: 'Use unknown, a narrow type, or a typed helper instead of `any`. A justified exception needs an eslint-disable-next-line with a reason.',
  rawPresignedPut: 'Upload through presignedUpload/putPresignedFile (utils/put-presigned-file.ts) instead of a raw fetch to the presigned URL.',
  duplicatedUtilities: 'Import clamp/sleep/isRecord from utils/primitives, initials from utils/text, formatBytes from utils/number-format instead of redefining them.',
  adHocFormatting: 'Use utils/number-format and utils/time-format instead of inline toLocale*String / new Intl.*.',
}

/**
 * Remaining oversizedFiles are documented exceptions: their templates alone
 * exceed the page cap, or the SFC is a dense row/player whose next split is a
 * behavior-risk rewrite (PostRow, Header, YouTube player, admin dashboards).
 */

/** Hand-written response shapes in types/api.ts. Alias the generated contract (Contracts.XDto) instead of redeclaring. */
const MAX_HAND_WRITTEN_API_TYPES = 111

describe('types/api.ts hand-written shapes', () => {
  it(`stays at or below ${MAX_HAND_WRITTEN_API_TYPES}`, () => {
    const count = (read('types/api.ts').match(/^export (?:type \w+(?:<[^=]*>)? = \{|interface )/gm) ?? []).length
    expect(count, 'Alias the generated contract in types/api-contracts.gen.ts instead of hand-writing a new shape; lower the cap when you alias more.').toBeLessThanOrEqual(MAX_HAND_WRITTEN_API_TYPES)
  })
})

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
