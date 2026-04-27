#!/usr/bin/env node
/**
 * Browser-level guard for feed post row clickability.
 *
 * Uses the running Nuxt app and mocks API calls in Chromium so the real home feed
 * renders one AppPostRow. This catches Vue prop/default/layering bugs that source
 * string tests cannot see.
 *
 * Usage:
 *   npm run dev
 *   npm run check:post-row-click
 *
 * Options:
 *   POST_ROW_CLICK_BASE_URL  Nuxt app URL (default: http://localhost:3000)
 */

const BASE_URL = (process.env.POST_ROW_CLICK_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const POST_ID = 'post-click-ui-test'
const POST_BODY = 'Clickable row browser test body unique words'

function envelope(data, pagination) {
  return JSON.stringify({ data, ...(pagination ? { pagination } : {}) })
}

async function importPlaywright() {
  try {
    return await import('playwright')
  } catch (err) {
    console.error(
      '\n[check-post-row-click] playwright is not installed.\n' +
        '  Install dependencies with npm install, then run again.\n',
    )
    throw err
  }
}

function testUser() {
  return {
    id: 'u-viewer',
    phone: '+15555550100',
    username: 'viewer',
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

async function mockApi(route, post) {
  const request = route.request()
  const url = new URL(request.url())

  if (url.origin === BASE_URL) {
    await route.continue()
    return
  }

  const path = url.pathname

  if (path.endsWith('/auth/me')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(testUser()) })
    return
  }

  if (path.endsWith('/posts') && request.method() === 'GET') {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope([post], { nextCursor: null, counts: { all: 1, public: 1, verifiedOnly: 0, premiumOnly: 0 } }),
    })
    return
  }

  if (path.endsWith(`/posts/${POST_ID}`)) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(post) })
    return
  }

  if (path.endsWith('/checkins/leaderboard')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({ users: [], viewerRank: null, weekStart: null, generatedAt: new Date().toISOString() }),
    })
    return
  }

  if (path.includes('/daily-checkin')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: envelope({
        prompt: 'Test prompt',
        hasCheckedInToday: true,
        allowedVisibilities: ['verifiedOnly'],
        checkinStreakDays: 0,
        coins: 0,
      }),
    })
    return
  }

  if (
    path.endsWith('/groups/me') ||
    path.endsWith('/groups/featured') ||
    path.includes('/presence') ||
    path.includes('/notifications') ||
    path.includes('/messages') ||
    path.includes('/follows') ||
    path.includes('/articles') ||
    path.includes('/meta') ||
    path.includes('/spaces')
  ) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: envelope([]) })
    return
  }

  await route.fulfill({ status: 200, contentType: 'application/json', body: envelope(null) })
}

async function main() {
  await waitForHttpReady(BASE_URL)

  const { chromium } = await importPlaywright()
  const browser = await chromium.launch()
  const page = await browser.newPage()
  const post = testPost()
  const pageErrors = []

  page.on('pageerror', (err) => {
    pageErrors.push(err?.stack || String(err))
  })

  await page.route('**/*', (route) => mockApi(route, post))

  try {
    await page.goto(`${BASE_URL}/home`, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForSelector(`[data-post-id="${POST_ID}"]`, { timeout: 30_000 })

    const bodyText = page.getByText(POST_BODY)
    await bodyText.waitFor({ timeout: 10_000 })

    const rowInfo = await bodyText.evaluate((el, postId) => {
      const row = el.closest(`[data-post-id="${postId}"][role="link"]`)
      return {
        foundClickableRow: Boolean(row),
        rowClass: row?.className ?? null,
        permalinkCount: row?.querySelectorAll(`a[href="/p/${postId}"]`).length ?? 0,
      }
    }, POST_ID)

    if (!rowInfo.foundClickableRow) {
      throw new Error(`Rendered row is not clickable: ${JSON.stringify(rowInfo)}`)
    }

    await bodyText.click({ position: { x: 20, y: 8 } })
    await page.waitForURL(`**/p/${POST_ID}`, { timeout: 10_000 })

    if (pageErrors.length) {
      throw new Error(`Browser page errors:\n${pageErrors.join('\n\n')}`)
    }

    console.log(`[check-post-row-click] OK - body click navigated to /p/${POST_ID}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(`[check-post-row-click] FAILED: ${err?.stack || err}`)
  process.exit(1)
})
