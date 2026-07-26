/**
 * Structural guardrails for the public API docs (/api).
 *
 * These pages exist to be copy-pasteable, so the things that silently rot are
 * wiring, not prose: a new section that never lands in the sidebar, a sample
 * curl pointing at localhost, a route that skips the hydration check.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { API_DOCS_NAV, PUBLIC_API_BASE } from '../config/api-docs'

const REPO_ROOT = resolve(process.cwd())

function readPage(file: string) {
  return readFileSync(resolve(REPO_ROOT, 'pages/api', file), 'utf8')
}

function pageFiles() {
  return readdirSync(resolve(REPO_ROOT, 'pages/api')).filter((f) => f.endsWith('.vue'))
}

/** '/api' -> 'index.vue', '/api/posts' -> 'posts.vue' */
function pageFileForRoute(route: string) {
  const slug = route.replace(/^\/api\/?/, '')
  return slug ? `${slug}.vue` : 'index.vue'
}

describe('public API docs base URL', () => {
  it('is an absolute production URL including the /v1 prefix', () => {
    // Samples are meant to be pasted into a terminal. A relative path or a
    // build-time localhost value would make every curl on the page wrong.
    expect(PUBLIC_API_BASE).toMatch(/^https:\/\/[^/]+\/v1$/)
  })

  it('does not end with a trailing slash (would cause double slashes in urls)', () => {
    expect(PUBLIC_API_BASE).not.toMatch(/\/$/)
  })
})

describe('public API docs pages', () => {
  it('has a page for every sidebar entry', () => {
    const files = pageFiles()
    for (const item of API_DOCS_NAV) {
      expect(files, `${item.to} is in the sidebar but has no page`).toContain(pageFileForRoute(item.to))
    }
  })

  it('has a sidebar entry for every page', () => {
    const routes = API_DOCS_NAV.map((item) => item.to)
    for (const file of pageFiles()) {
      const route = file === 'index.vue' ? '/api' : `/api/${file.replace(/\.vue$/, '')}`
      expect(routes, `${route} exists but is unreachable from the sidebar`).toContain(route)
    }
  })

  it('renders every page in the docs layout', () => {
    for (const file of pageFiles()) {
      expect(readPage(file), `${file} must use the docs layout`).toMatch(/layout:\s*'docs'/)
    }
  })

  it('never hardcodes the API host in page markup', () => {
    // Display URLs must come from useApiDocsUrl() / useApiClient() so they reflect
    // the environment (localhost in dev, api.menofhunger.com in prod).
    const host = new URL(PUBLIC_API_BASE).host
    for (const file of pageFiles()) {
      expect(readPage(file), `${file} should not hardcode ${host}`).not.toContain(
        `https://${host}/v1`,
      )
    }
  })
})

describe('public API docs routing', () => {
  it('checks hydration on every docs route', () => {
    const { routes } = JSON.parse(
      readFileSync(resolve(REPO_ROOT, 'scripts/hydration-routes.json'), 'utf8'),
    ) as { routes: string[] }
    for (const item of API_DOCS_NAV) {
      expect(routes, `${item.to} is missing from hydration-routes.json`).toContain(item.to)
    }
  })

  it('declares each docs route explicitly, never as an /api/** wildcard', () => {
    // @nuxt/icon serves its runtime bundle from /api/_nuxt_icon/*. A wildcard
    // rule here would hand those requests our no-store HTML cache headers.
    const config = readFileSync(resolve(REPO_ROOT, 'nuxt.config.ts'), 'utf8')
    expect(config).not.toMatch(/['"]\/api\/\*\*['"]\s*:/)
    for (const item of API_DOCS_NAV) {
      expect(config, `${item.to} needs a routeRule`).toContain(`'${item.to}':`)
    }
  })
})
