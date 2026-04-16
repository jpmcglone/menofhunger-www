import { readFileSync, readdirSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Guardrail: no ad-hoc `fetch(...)` / `$fetch(...)` calls to the backend API base URL.
 *
 * Rule (.cursor/rules/00-project-overview.mdc):
 *   "Call the backend via useApiClient() (no ad-hoc fetch/base URLs)"
 *
 * This test scans the app source tree for common violations:
 *   - fetch(<anything containing apiBaseUrl>)
 *   - $fetch(<anything containing apiBaseUrl>)
 *
 * Allow-listed files are legitimate infrastructure (the client itself,
 * SSR sitemap routes, presence WebSocket URL construction, etc.).
 */

const REPO_ROOT = resolve(process.cwd())

// Files that are allowed to reference `apiBaseUrl` directly. Add rarely and deliberately.
const ALLOW_LIST = new Set<string>([
  // The client itself defines and uses the URL.
  'composables/useApiClient.ts',
  // Exposes apiBaseUrl from useApiClient() (no direct fetch to it).
  'composables/useApiHealth.ts',
  // Turns apiBaseUrl into a WebSocket URL (Socket.IO), not a fetch.
  'composables/usePresence.ts',
  // Nuxt config defines runtimeConfig.apiBaseUrl.
  'nuxt.config.ts',
  // SSR-only sitemap routes (Nitro server routes, not product API features).
  'server/routes/sitemap-articles.xml.get.ts',
  'server/routes/sitemap-profiles.xml.get.ts',
])

// Directories to scan. We skip tests, build output, node_modules, config, etc.
const SCAN_DIRS = [
  'app',
  'composables',
  'components',
  'layouts',
  'middleware',
  'pages',
  'plugins',
  'utils',
]

function walk(dir: string, acc: string[]): void {
  const full = resolve(REPO_ROOT, dir)
  let entries: string[] = []
  try {
    entries = readdirSync(full)
  } catch {
    return
  }
  for (const entry of entries) {
    const path = resolve(full, entry)
    let st
    try {
      st = statSync(path)
    } catch {
      continue
    }
    if (st.isDirectory()) {
      walk(relative(REPO_ROOT, path), acc)
      continue
    }
    if (/\.(ts|tsx|vue|mjs|js)$/.test(entry)) {
      acc.push(relative(REPO_ROOT, path))
    }
  }
}

function getFilesToScan(): string[] {
  const files: string[] = []
  for (const dir of SCAN_DIRS) walk(dir, files)
  return files.filter((f) => !ALLOW_LIST.has(f))
}

describe('ad-hoc fetch guardrails', () => {
  it('no files outside the allow-list reference `apiBaseUrl` directly', () => {
    const offenders: Array<{ file: string; match: string }> = []
    for (const file of getFilesToScan()) {
      const src = readFileSync(resolve(REPO_ROOT, file), 'utf8')
      if (!src.includes('apiBaseUrl')) continue
      // First non-trivial line that mentions `apiBaseUrl` — gives useful context in the failure.
      const firstLine = src
        .split('\n')
        .find((l) => l.includes('apiBaseUrl')) || ''
      offenders.push({ file, match: firstLine.trim().slice(0, 160) })
    }
    expect(offenders, `Use useApiClient() instead of referencing apiBaseUrl directly.\nOffenders:\n${offenders
      .map((o) => `  - ${o.file}: ${o.match}`)
      .join('\n')}`).toEqual([])
  })

  it('no files call `fetch(<url containing apiBaseUrl>)` or `$fetch(<url containing apiBaseUrl>)`', () => {
    // This is redundant with the broader apiBaseUrl check above, but gives a more
    // specific failure message when someone writes the canonical anti-pattern.
    const pattern = /\$?\bfetch\s*\(\s*[^)]*apiBaseUrl/i
    const offenders: string[] = []
    for (const file of getFilesToScan()) {
      const src = readFileSync(resolve(REPO_ROOT, file), 'utf8')
      if (pattern.test(src)) offenders.push(file)
    }
    expect(offenders, `Use useApiClient().apiFetch / apiFetchData instead.\nOffenders:\n${offenders
      .map((f) => `  - ${f}`)
      .join('\n')}`).toEqual([])
  })
})
