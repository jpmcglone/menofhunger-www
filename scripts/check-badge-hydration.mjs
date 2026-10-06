#!/usr/bin/env node
/** Isolated authenticated SSR/browser fixture; no real accounts or API mutations. */
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const user = { id: 'performance-fixture', username: 'fixture', name: 'Fixture', usernameIsSet: true,
  verifiedStatus: 'manual', premium: false, premiumPlus: false, isOrganization: false,
  accountKind: 'person', birthdate: '1990-01-01', menOnlyConfirmed: true, interests: ['fitness'],
  notificationUndeliveredCount: 7, notificationUnreadCommentCount: 0,
  messageUnreadCounts: { primary: 0, requests: 0 }, groupsUnread: { total: 0, byGroupId: {} },
  crewInviteInboxCount: 0, groupInviteInboxCount: 0 }
const requests = []
const held = []
const json = (res, data) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)) }
const api = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Headers', 'content-type,x-request-id,x-csrf-token,x-client-platform')
  if (req.method === 'OPTIONS') { res.end(); return }
  const path = new URL(req.url, 'http://fixture').pathname
  requests.push(path)
  if (path.endsWith('/notifications/unread-count')) { held.push(res); return }
  if (path.endsWith('/auth/me')) return json(res, { data: user })
  if (path.endsWith('/auth/accounts')) return json(res, { data: [] })
  if (path.includes('/socket.io')) { res.statusCode = 503; res.end(); return }
  if (path.endsWith('/notifications/unread-by-kind')) return json(res, { data: {} })
  if (path.endsWith('/notifications/groups-unread')) return json(res, { data: { total: 0, byGroupId: {} } })
  return json(res, { data: [], pagination: { nextCursor: null, hasMore: false } })
})
await new Promise(resolve => api.listen(0, '127.0.0.1', resolve))
const apiUrl = `http://127.0.0.1:${api.address().port}/v1`
// Reserve an ephemeral port; release immediately before spawning the bounded preview.
const probe = createServer()
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
const port = probe.address().port
await new Promise(resolve => probe.close(resolve))
const server = spawn(process.execPath, ['.output/server/index.mjs'], { env: { ...process.env,
  PORT: String(port), NUXT_PORT: String(port), HOST: '127.0.0.1',
  NUXT_API_BASE_URL: apiUrl, NUXT_PUBLIC_API_BASE_URL: apiUrl,
  NUXT_PUBLIC_SENTRY_DSN: '', SENTRY_DSN: '', NUXT_PUBLIC_POSTHOG_KEY: '',
}, stdio: ['ignore', 'pipe', 'pipe'] })
let serverLog = ''
server.stderr.on('data', value => { serverLog += value })
let browser
const cleanup = () => {
  for (const res of held) res.destroy()
  server.kill('SIGTERM')
  api.closeAllConnections()
  api.close()
}
process.once('SIGINT', cleanup)
process.once('SIGTERM', cleanup)
try {
  const base = `http://127.0.0.1:${port}`
  let available = false
  for (let i = 0; i < 120; i++) {
    try { await fetch(`${base}/health`); available = true; break } catch { /* Preview has not bound its port yet. */ }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  assert(available, serverLog)
  const response = await fetch(`${base}/notifications`, {
    headers: { cookie: 'moh_session=synthetic-fixture' }, signal: AbortSignal.timeout(10_000),
  })
  const html = await response.text()
  assert.equal(response.status, 200)
  assert(html.includes('performance-fixture'), 'authenticated state must be serialized')
  assert.equal(held.length, 0, 'SSR must not start badge recovery')
  browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  await context.addCookies([{ name: 'moh_session', value: 'synthetic-fixture', url: base }])
  const page = await context.newPage()
  const errors = []
  page.on('console', message => { if (/hydration.*mismatch/i.test(message.text())) errors.push(message.text()) })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${base}/notifications`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  await page.waitForFunction(() => document.body.innerText.includes('Notifications'))
  for (let i = 0; i < 100 && held.length === 0; i++) await page.waitForTimeout(20)
  assert(held.length > 0, 'client mount must start recovery')
  const labels = () => page.locator('a[href="/chat"], a[href="/notifications"]').evaluateAll(links =>
    links.map(link => { const r = link.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height } }))
  const before = await labels()
  assert(before.some(rect => rect.width > 0), 'navigation must be usable while recovery is held')
  for (const res of held.splice(0)) json(res, { data: { count: 0, unreadCommentCount: 0,
    boardUnreadCount: 0, articlesUnreadCount: 0, hasUnreadNotifications: true } })
  await page.waitForTimeout(300)
  assert.deepEqual(await labels(), before, 'badge recovery must not move navigation geometry')
  assert.deepEqual(errors, [], 'hydration must not warn or throw')
  process.stdout.write(JSON.stringify({ authenticatedSSR: 'pass', mountedRecovery: 'pass', stableNavigation: 'pass', requests }, null, 2) + "\n")
} finally {
  await browser?.close()
  cleanup()
}
