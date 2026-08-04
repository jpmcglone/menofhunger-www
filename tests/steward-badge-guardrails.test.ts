import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The steward shield is a member opt-out: `stewardBadgeEnabled` on the user.
 * `AppVerifiedBadge` only renders the shield when it receives BOTH
 * `premiumPlus` and `stewardBadgeEnabled`, so a call site that passes the
 * former without the latter used to print the shield for members who had
 * turned it off (search results, the user picker, and the referral row all
 * did).
 *
 * The component now defaults `stewardBadgeEnabled` to `false`, which makes an
 * omission fail closed instead of fabricating a badge. This test covers the
 * other direction: it catches the call site that forgot the prop and would
 * silently stop showing a badge a member does want.
 *
 * Decorative uses — the visibility picker and the feed filter legend, which
 * render a generic tier icon rather than a person — pass neither prop and are
 * therefore not flagged.
 */

const REPO_ROOT = resolve(process.cwd())
const SEARCH_DIRS = ['components', 'pages', 'layouts']

function vueFiles(dir: string): string[] {
  const out: string[] = []
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
      const full = join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (full.endsWith('.vue')) out.push(full)
    }
  }
  walk(dir)
  return out
}

type BadgeUsage = { file: string; line: number; tag: string }

function badgeUsages(): BadgeUsage[] {
  const usages: BadgeUsage[] = []
  for (const dir of SEARCH_DIRS) {
    for (const file of vueFiles(resolve(REPO_ROOT, dir))) {
      const source = readFileSync(file, 'utf8')
      const tagPattern = /<AppVerifiedBadge\b[\s\S]*?\/?>/g
      let match: RegExpExecArray | null
      while ((match = tagPattern.exec(source)) !== null) {
        usages.push({
          file: relative(REPO_ROOT, file),
          line: source.slice(0, match.index).split('\n').length,
          tag: match[0],
        })
      }
    }
  }
  return usages
}

describe('steward badge honors the member setting', () => {
  it('finds the badge component in use (guards against a silently vacuous test)', () => {
    expect(badgeUsages().length).toBeGreaterThan(10)
  })

  it('passes steward-badge-enabled wherever premium-plus is passed', () => {
    const offenders = badgeUsages()
      .filter((u) => /:premium-plus|:premiumPlus/.test(u.tag))
      .filter((u) => !/:steward-badge-enabled|:stewardBadgeEnabled/.test(u.tag))
      .map((u) => `${u.file}:${u.line}`)

    expect(offenders).toEqual([])
  })

  it('renders the shield only when premiumPlus and the member setting agree', () => {
    const badge = readFileSync(resolve(REPO_ROOT, 'components/app/VerifiedBadge.vue'), 'utf8')
    expect(badge).toMatch(
      /const showSteward = computed\(\(\) => Boolean\(props\.premiumPlus && props\.stewardBadgeEnabled\)\)/,
    )
  })

  it('defaults stewardBadgeEnabled to false so an omitted prop fails closed', () => {
    const badge = readFileSync(resolve(REPO_ROOT, 'components/app/VerifiedBadge.vue'), 'utf8')
    expect(badge).toMatch(/stewardBadgeEnabled:\s*false/)
    expect(badge).not.toMatch(/stewardBadgeEnabled:\s*true/)
  })
})
