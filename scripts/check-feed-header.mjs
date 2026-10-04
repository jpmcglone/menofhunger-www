/** Bounded, isolated preview check. Uses synthetic accounts; no production writes. */
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const probe = createServer()
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
const port = probe.address().port
await new Promise(resolve => probe.close(resolve))
const BASE_URL = process.env.FEED_CHECK_BASE_URL || `http://127.0.0.1:${port}`
const POST_ID = 'post-click-ui-test'
const POST_BODY = 'A conversation in the compact feed.'
function envelope(data, pagination) {
  return JSON.stringify({ data, ...(pagination ? { pagination } : {}) })
}

function testUser() {
  return {
    id: 'u-viewer',
    phone: '+15555550100',
    username: 'viewer',
    usernameIsSet: true,
    birthdate: '1990-01-01',
    interests: ['faith'],
    menOnlyConfirmed: true,
    locationPromptSkipped: true,
    name: 'Viewer',
    verifiedStatus: 'identity',
    premium: false,
    premiumPlus: false,
    avatarUrl: null,
    notificationUndeliveredCount: 0,
    messageUnreadCounts: { primary: 0, requests: 0 },
    featureToggles: [],
  }
}

function testPost() {
  const now = new Date().toISOString()
  const author = {
    id: 'u-author',
    username: 'author',
    name: 'Author Man',
    verifiedStatus: 'identity',
    premium: false,
    premiumPlus: false,
    isOrganization: false,
    avatarUrl: null,
    bannedAt: null,
  }

  return {
    id: POST_ID,
    createdAt: now,
    editedAt: null,
    body: POST_BODY,
    deletedAt: null,
    kind: 'regular',
    visibility: 'public',
    topics: [],
    hashtags: [],
    boostCount: 0,
    bookmarkCount: 0,
    commentCount: 0,
    repostCount: 0,
    viewerCount: 0,
    parentId: null,
    communityGroupId: null,
    pinnedInGroupAt: null,
    mentions: [],
    media: [],
    poll: null,
    viewerHasBoosted: false,
    viewerHasBookmarked: false,
    viewerBookmarkCollectionIds: [],
    viewerHasReposted: false,
    viewerBlockStatus: null,
    viewerCanAccess: true,
    author,
  }
}

async function waitForHttpReady(url, timeoutMs = 15_000) {
  const start = Date.now()
  let lastError = null
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.status < 500) return
      lastError = new Error(`status ${res.status}`)
    } catch (err) {
      lastError = err
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Nuxt app at ${url} did not become ready: ${lastError?.message ?? 'unknown error'}`)
}


const previewArgs = process.env.FEED_CHECK_DEV === '1'
  ? ['node_modules/@nuxt/cli/bin/nuxi.mjs', 'dev', '--host', '127.0.0.1', '--port', String(port), '--no-fork']
  : ['.output/server/index.mjs']
const child = process.env.FEED_CHECK_BASE_URL ? null : spawn(process.execPath, previewArgs, { env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', NUXT_API_BASE_URL: 'http://127.0.0.1:1/v1', NUXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:1/v1' }, stdio: 'ignore', detached: true })
function stopPreview() {
  if (!child?.pid) return
  try { process.kill(-child.pid, 'SIGTERM') } catch (error) { if (error.code !== 'ESRCH') throw error }
}
let browser
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { stopPreview(); void browser?.close().finally(() => process.exit(130)) })
try {
  await waitForHttpReady(BASE_URL, process.env.FEED_CHECK_DEV === '1' ? 90000 : 30000)
  browser = await chromium.launch({ headless: true })
  const errors = []
  const page = await browser.newPage()
  await page.clock.install({ time: new Date('2026-10-04T17:00:00Z') })
  page.on('pageerror', error => errors.push((error.stack || error.message).split('\n').slice(0, 2).join('\n')))
  page.on('console', message => { if (/hydration.*mismatch/i.test(message.text())) errors.push(message.text()) })
  await page.addInitScript(() => { localStorage.setItem('moh.activation.v1.u-viewer.approved', '1') })
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin === BASE_URL) return route.continue()
    if (!url.pathname.startsWith('/v1/')) return route.abort()
    const path = url.pathname
    let data = null
    let pagination
    if (path.endsWith('/auth/me')) data = testUser()
    else if (path.endsWith('/posts/insights/weekly')) data = { from: '2026-09-28', to: '2026-10-04', postCount: 1, participantCount: 1, newParticipantCount: 0, timeline: [], posts: [{ id: POST_ID, body: POST_BODY, participantCount: 1, participants: [], replies: [] }] }
    else if (path.endsWith('/posts')) { data = [testPost()]; pagination = { nextCursor: null } }
    else if (path.endsWith('/checkins/today')) data = { dayKey: '2026-10-04', isOpen: false, hasCheckedInToday: false, allowedVisibilities: ['verifiedOnly'], checkinStreakDays: 0 }
    else if (path.endsWith('/groups/me')) data = [{ id: 'g1', slug: 'daily-practice', name: 'Daily Practice', joinPolicy: 'open', memberCount: 1, description: '', avatarImageUrl: null, coverImageUrl: null, viewerMembership: { status: 'active', role: 'member' } }]
    else if (path.endsWith('/checkins/leaderboard')) data = { users: [], viewerRank: null, generatedAt: '2026-10-04T17:00:00Z' }
    else if (path.includes('/following-count')) data = 1
    else if (/presence|notifications|messages|follows|articles|meta|spaces|groups|leaderboard/.test(path)) data = []
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(data, pagination) })
  })
  for (const width of [1440, 390]) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 1000 })
      await page.emulateMedia({ colorScheme: theme })
      await page.goto(`${BASE_URL}/home`)
      await page.evaluate(value => localStorage.setItem('color-mode', value), theme)
      await page.reload()
      for (let attempt = 0; attempt < 3 && !(await page.locator('html').getAttribute('class'))?.split(' ').includes(theme); attempt++) {
        await page.keyboard.press('Control+Shift+Period')
        await page.waitForTimeout(100)
      }
      assert.ok((await page.locator('html').getAttribute('class'))?.split(' ').includes(theme))
      const composer = page.locator('.moh-home-composer')
      await composer.waitFor()
      await page.getByText('Check-ins open at 5pm ET', { exact: true }).first().waitFor()
      const destination = composer.getByRole('button', { name: 'Post to: Public', exact: true })
      await destination.waitFor()
      assert.equal(await composer.getByText(/0\s*\/\s*500/).count(), 0)
      const postButton = composer.getByRole('button', { name: 'Post', exact: true })
      assert.equal(await postButton.isDisabled(), true)
      assert.equal(await postButton.evaluate(button => {
        const swatch = document.createElement('span')
        swatch.style.color = 'var(--moh-button-disabled-fill)'
        button.append(swatch)
        const expected = getComputedStyle(swatch).color
        swatch.remove()
        return getComputedStyle(button).backgroundColor === expected
      }), true, 'Empty Post button uses the disabled fill')
      await destination.click()
      const dialog = page.getByRole('dialog')
      await dialog.screenshot({ path: `/tmp/moh-picker-feed-${width}-${theme}.png` })
      await dialog.getByRole('tab', { name: 'Group', exact: true }).click()
      await dialog.screenshot({ path: `/tmp/moh-picker-group-${width}-${theme}.png` })
      await dialog.getByRole('button', { name: /Daily Practice/ }).click()
      await composer.getByRole('button', { name: 'Post to: Daily Practice', exact: true }).click()
      await page.getByRole('dialog').getByRole('tab', { name: 'Feed', exact: true }).click()
      await page.getByRole('dialog').getByRole('button', { name: /Public Everyone/ }).click()
      await destination.waitFor()
      const editor = composer.locator('[contenteditable="true"]').first()
      await editor.fill('A draft')
      await composer.getByText(/7\s*\/\s*500/).waitFor()
      assert.equal(await composer.getByRole('button', { name: 'Post', exact: true }).isEnabled(), true)
      await editor.fill('')
      await page.getByRole('button').filter({ hasText: 'Your week →' }).click()
      await page.getByRole('dialog').getByText('Private to you', { exact: false }).first().waitFor()
      await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click()
      await page.getByRole('dialog').waitFor({ state: 'hidden' })
      assert.ok((await page.locator('html').getAttribute('class'))?.split(' ').includes(theme))
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true)
      await page.screenshot({ path: `/tmp/moh-feed-${width}-${theme}.png` })
    }
  }
  assert.deepEqual(errors, [])
  console.warn('Feed header: desktop/mobile light/dark, group → public, draft counter, disabled Post, private recap, and hydration passed.')
} finally { await browser?.close(); stopPreview() }
