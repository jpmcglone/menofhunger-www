#!/usr/bin/env node
/**
 * Runtime hydration check.
 *
 * Spins up the production Nuxt server (`node .output/server/index.mjs`) on a
 * test port, then visits each route in `scripts/hydration-routes.json` with a
 * headless Chromium browser. Fails if any page logs a Vue hydration warning
 * or throws an uncaught error.
 *
 * Usage:
 *   npm run build && npm run check:hydration
 *
 * Options (env):
 *   HYDRATION_BASE_URL   If set, skip spawning a server and use this URL instead.
 *                         (e.g. http://localhost:3000 to test a running dev server)
 *   HYDRATION_PORT       Port for the spawned server (default: 4173)
 *   HYDRATION_TIMEOUT_MS Per-route navigation timeout (default: 30000)
 */

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '..')

const BASE_URL_ENV = process.env.HYDRATION_BASE_URL?.trim() || ''
const PORT = Number(process.env.HYDRATION_PORT || 4173)
const NAV_TIMEOUT_MS = Number(process.env.HYDRATION_TIMEOUT_MS || 30000)

function loadRoutes() {
  const file = resolve(REPO, 'scripts/hydration-routes.json')
  const raw = JSON.parse(readFileSync(file, 'utf8'))
  if (!Array.isArray(raw.routes)) {
    throw new Error(`hydration-routes.json: expected { routes: string[] }`)
  }
  return raw.routes
}

async function importPlaywright() {
  try {
    return await import('playwright')
  } catch (err) {
    console.error(
      '\n[check-hydration] playwright is not installed.\n' +
        '  Install once with:  npm i -D playwright && npx playwright install chromium\n',
    )
    throw err
  }
}

async function waitForHttpReady(url, timeoutMs = 30000) {
  const start = Date.now()
  let lastErr
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' })
      if (res.status < 500) return
      lastErr = new Error(`Status ${res.status}`)
    } catch (err) {
      lastErr = err
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Server at ${url} did not become ready: ${lastErr?.message ?? 'unknown'}`)
}

async function spawnPreviewServer() {
  const entry = resolve(REPO, '.output/server/index.mjs')
  if (!existsSync(entry)) {
    throw new Error(
      `Built server not found at ${entry}. Run \`npm run build\` first, ` +
        `or set HYDRATION_BASE_URL to point at a running server.`,
    )
  }
  const child = spawn('node', [entry], {
    cwd: REPO,
    env: { ...process.env, PORT: String(PORT), NUXT_PORT: String(PORT) },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let stderrBuf = ''
  child.stdout.on('data', () => {})
  child.stderr.on('data', (d) => {
    stderrBuf += d.toString()
  })
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[check-hydration] preview server exited (${code}):\n${stderrBuf}`)
    }
  })

  const url = `http://127.0.0.1:${PORT}`
  await waitForHttpReady(url)
  return { url, kill: () => child.kill('SIGTERM') }
}

function isHydrationMessage(text) {
  if (!text) return false
  const t = String(text)
  if (/\[Vue warn\][^\n]*[Hh]ydration/.test(t)) return true
  if (/Hydration (?:node|children|class|style|attribute|text content) mismatch/i.test(t)) return true
  return false
}

async function checkRoute(browser, baseUrl, route) {
  const url = new URL(route, baseUrl).toString()
  const context = await browser.newContext()
  const page = await context.newPage()

  const hydrationMessages = []
  const pageErrors = []
  const otherVueWarnings = []

  page.on('console', (msg) => {
    const text = msg.text()
    if (isHydrationMessage(text)) {
      hydrationMessages.push({ type: msg.type(), text })
    } else if (/\[Vue warn\]/.test(text)) {
      otherVueWarnings.push(text)
    }
  })
  page.on('pageerror', (err) => {
    pageErrors.push(err?.stack || String(err))
  })

  let navError = null
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: NAV_TIMEOUT_MS })
  } catch (err) {
    navError = err?.message || String(err)
  }

  await context.close()

  const ok = !navError && hydrationMessages.length === 0 && pageErrors.length === 0
  return { route, url, ok, navError, hydrationMessages, pageErrors, otherVueWarnings }
}

function fmt(result) {
  const lines = []
  const status = result.ok ? 'PASS' : 'FAIL'
  lines.push(`  [${status}] ${result.route}`)
  if (result.navError) lines.push(`    navigation error: ${result.navError}`)
  for (const m of result.hydrationMessages) lines.push(`    hydration ${m.type}: ${m.text}`)
  for (const e of result.pageErrors) lines.push(`    pageerror: ${e.split('\n')[0]}`)
  return lines.join('\n')
}

async function main() {
  const routes = loadRoutes()
  console.log(`[check-hydration] checking ${routes.length} route(s)`)

  const { chromium } = await importPlaywright()

  let baseUrl = BASE_URL_ENV
  let stopServer = null
  if (!baseUrl) {
    const server = await spawnPreviewServer()
    baseUrl = server.url
    stopServer = server.kill
    console.log(`[check-hydration] preview server up at ${baseUrl}`)
  } else {
    console.log(`[check-hydration] using HYDRATION_BASE_URL=${baseUrl}`)
  }

  const browser = await chromium.launch()
  const results = []
  try {
    for (const route of routes) {
      const r = await checkRoute(browser, baseUrl, route)
      console.log(fmt(r))
      results.push(r)
    }
  } finally {
    await browser.close()
    if (stopServer) stopServer()
  }

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) {
    console.error(`\n[check-hydration] FAILED — ${failed.length}/${results.length} route(s) had hydration issues.`)
    console.error(`See the 'runtime-hydration-check' and 'ssr-hydration' skills for how to fix.`)
    process.exit(1)
  }

  console.log(`\n[check-hydration] OK — all ${results.length} route(s) hydrated cleanly.`)
}

main().catch((err) => {
  console.error('[check-hydration] error:', err?.stack || err)
  process.exit(1)
})
