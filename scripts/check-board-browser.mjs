/** Bounded Board interaction check with synthetic API responses and no production writes. */
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { createServer as createHttpServer } from 'node:http'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const probe = createServer()
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
const port = probe.address().port
await new Promise(resolve => probe.close(resolve))
const origin = `http://127.0.0.1:${port}`
let browser
let page
const user = { id: 'viewer', phone: '+15555550100', username: 'viewer', usernameIsSet: true, birthdate: '1990-01-01', interests: ['faith'], menOnlyConfirmed: true, locationPromptSkipped: true, name: 'Viewer', verifiedStatus: 'identity', premium: false, premiumPlus: false, notificationUndeliveredCount: 2, messageUnreadCounts: { primary: 0, requests: 0 }, featureToggles: [] }
const author = { id: 'author', username: 'james', name: 'James', verifiedStatus: 'identity', premium: false, premiumPlus: false, isOrganization: false, avatarUrl: null }
const timestamp = new Date().toISOString()
let unread = new Set(['one', 'two', 'three'])
let seen = false
let reads = 0
function thread(id) {
  return { id, title: `Discussion ${id}`, url: 'https://example.com/story', domain: 'example.com', tags: ['ask'], visibility: 'public', body: 'A useful discussion.', image: null, author, mentions: [], createdAt: timestamp, editedAt: null, points: 2, commentCount: 3, viewerCount: 1, totalViewCount: 1, viewerHasViewed: true, showInFeed: true, articleId: null, viewerCanAccess: true, viewerHasBoosted: false, viewerHasBookmarked: false, viewerHidden: false, viewerCanEdit: false, unreadActivity: unread.has(id) ? 'comments' : null, unreadCommentCount: unread.has(id) ? 2 : 0 }
}
const apiServer = createHttpServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname.slice(3)
  let data = []
  if (path.includes('announcement')) data = null
  else if (path === '/auth/me') data = user
  else if (/^\/board\/threads\/[^/]+$/.test(path)) data = thread(path.split('/').at(-1))
  else if (path.endsWith('/comments')) data = { viewerCanAccess: true, comments: [] }
  response.writeHead(200, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify({ data }))
})
await new Promise(resolve => apiServer.listen(0, '127.0.0.1', resolve))
const apiOrigin = `http://127.0.0.1:${apiServer.address().port}`
const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', NUXT_API_BASE_URL: apiOrigin + '/v1', NUXT_PUBLIC_API_BASE_URL: apiOrigin + '/v1' }, stdio: ['ignore', 'pipe', 'pipe'],
})

let previewLogs = ''
server.stdout.on('data', chunk => { previewLogs += chunk.toString() })
server.stderr.on('data', chunk => { previewLogs += chunk.toString() })
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  server.kill('SIGTERM'); apiServer.closeAllConnections(); apiServer.close()
  void Promise.resolve(browser?.close()).finally(() => process.exit(130))
})
try {
  let ready = false
  for (let attempt = 0; attempt < 120; attempt++) {
    if (server.exitCode !== null) throw new Error(previewLogs)
    try { if ((await fetch(origin)).ok) { ready = true; break } } catch { /* Preview is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  if (!ready) throw new Error(`Preview failed to become ready: ${previewLogs}`)
  browser = await chromium.launch({ headless: true })
  page = await browser.newPage()
  await page.context().addCookies([{ name: 'moh_session', value: 'board-fixture', url: origin }])
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => localStorage.setItem('moh.activation.v1.viewer.approved', '1'))
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin === origin) return route.continue()
    if (!url.pathname.startsWith('/v1/')) return route.abort()
    const path = url.pathname.slice(3)
    let data = []; let pagination
    if (path.includes('announcement')) data = null
    else if (path === '/auth/me') data = user
    else if (path === '/notifications/mark-delivered') { assert.equal(route.request().postDataJSON().filter, 'board'); seen = true; data = {} }
    else if (path === '/notifications/mark-read') {
      reads++
      const body = route.request().postDataJSON()
      if (body.filter === 'board') unread.clear()
      else if (body.board_thread_id) unread.delete(body.board_thread_id)
      data = {}
    } else if (path === '/notifications/unread-count') data = { count: seen ? 0 : 2, boardUnreadCount: seen ? 0 : 2, articlesUnreadCount: 0, unreadCommentCount: unread.size }
    else if (path === '/notifications') {
      if (url.searchParams.get('kind') === 'board') assert.equal(url.searchParams.get('boardCommentsOnly'), 'true')
      data = unread.has('two') ? [{ type: 'single', notification: { id: 'notice', kind: 'mention', actor: author, createdAt: timestamp, readAt: null, boardThreadId: 'two', boardCommentId: 'reply', body: 'What do you think?', post: null } }] : []
      pagination = { nextCursor: null, undeliveredCount: 0 }
    } else if (path === '/board/threads') { data = (url.searchParams.has('cursor') ? ['three'] : ['one', 'two']).map(thread); pagination = { nextCursor: url.searchParams.has('cursor') ? null : 'page2' } }
    else if (/^\/board\/threads\/[^/]+$/.test(path)) data = thread(path.split('/').at(-1))
    else if (/^\/board\/threads\/[^/]+\/comments$/.test(path)) data = { viewerCanAccess: true, comments: [] }
    else if (path === '/board/comments') { data = []; pagination = { nextCursor: null } }
    else if (path.endsWith('/following-count')) data = 1
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data, ...(pagination ? { pagination } : {}) }) })
  })
  for (const width of [1440, 390]) {
    for (const theme of ['light', 'dark']) {
      unread = new Set(['one', 'two', 'three']); seen = false; reads = 0
      await page.setViewportSize({ width, height: 1000 })
      await page.emulateMedia({ colorScheme: theme })
      await page.goto(`${origin}/b`)
      await page.evaluate(value => localStorage.setItem('color-mode', value), theme)
      await page.reload()
      await page.getByRole('link', { name: 'Discussion one', exact: true }).waitFor()
      for (let i = 0; i < 3 && !(await page.evaluate(value => document.documentElement.classList.contains(value), theme)); i++) {
        await page.keyboard.press('Control+Shift+Period')
        await page.waitForTimeout(100)
      }
      await page.waitForFunction(value => document.documentElement.classList.contains(value), theme)
      if (width === 1440) assert.equal(await page.getByText('Home', { exact: true }).first().isVisible(), true)
      await page.waitForFunction(() => document.querySelectorAll('main article [aria-label="Unread activity"]').length === 2)
      for (let i = 0; !seen && i < 50; i++) await page.waitForTimeout(100)
      assert.equal(seen, true)
      assert.equal(reads, 0)
      assert.equal(await page.getByRole('tab', { name: 'Activity', exact: true }).count(), 0)
      await page.locator('button.w-full.border-t').filter({ hasText: /^More$/ }).click()
      await page.getByRole('link', { name: 'Discussion three', exact: true }).waitFor()
      assert.equal(await page.locator('main article [aria-label="Unread activity"]').count(), 3)
      await page.waitForTimeout(400)
      await page.screenshot({ path: `/tmp/moh-board-${width}-${theme}.png` })
      await page.getByRole('tab', { name: /Comments/ }).click()
      await page.getByRole('button', { name: 'For you', exact: true }).waitFor()
      assert.equal(await page.getByRole('button', { name: 'For you', exact: true }).getAttribute('aria-pressed'), 'true')
      await page.getByText('What do you think?', { exact: true }).waitFor()
      await page.getByRole('tab', { name: 'New', exact: true }).click()
      await page.getByRole('link', { name: 'Discussion one', exact: true }).click()
      await page.waitForURL('**/b/one')
      await page.waitForTimeout(250)
      assert.equal(unread.has('one'), false)
      await page.goto(`${origin}/b`)
      await page.getByRole('link', { name: 'Discussion one', exact: true }).waitFor()
      assert.equal(await page.locator('main article [aria-label="Unread activity"]').count(), 1)
      await page.getByLabel('More Board options', { exact: true }).click()
      await page.getByRole('button', { name: 'Mark all Board activity as read', exact: true }).click()
      await page.waitForFunction(() => document.querySelectorAll('main article [aria-label="Unread activity"]').length === 0)
      assert.equal(unread.size, 0)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true)
    }
  }
  assert.deepEqual(errors, [])
  console.warn('Board: desktop/mobile light/dark; entry seen-only, paginated unread dots, Comments For you, thread read and mark all read passed.')
} catch (error) {
  console.error('Board check location:', page?.url())
  if (page) { await page.screenshot({ path: '/tmp/moh-board-check-failure.png' }); console.error((await page.locator('body').innerText()).slice(0, 2000)) }
  throw error
} finally { await browser?.close(); server.kill('SIGTERM'); apiServer.closeAllConnections(); apiServer.close() }
