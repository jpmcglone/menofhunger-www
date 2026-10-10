// Real dock/list components with isolated, network-free data. Always closes the preview.
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { chromium } from 'playwright'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const root = resolve(import.meta.dirname, '..')
const fixture = resolve(root, 'tests/chat-dock-browser')
const mocks = resolve(fixture, 'fixture-api.ts')
const server = await createServer({
  configFile: false, root: fixture, define: { 'import.meta.client': 'true' },
  resolve: { alias: [
    ...['composables/calls/useCallSession', 'composables/chat/useChatDockSounds', 'composables/presence/usePresenceCallback', 'composables/useUsersStore'].map(path => ({ find: `~/${path}`, replacement: mocks })),
    { find: './ChatWorkspace.vue', replacement: resolve(fixture, 'Workspace.vue') },
    { find: '~', replacement: root },
  ] },
  plugins: [{ name: 'fixture-client-flags', enforce: 'pre', transform(source, id) { if (/\.(?:ts|vue)$/.test(id)) return source.replaceAll('import.meta.client', 'true') } }, vue(), AutoImport({ imports: ['vue', { [mocks]: ['useState', 'useHydratedMediaQuery', 'useRoute', 'navigateTo', 'useAuth', 'useSpaceLobby', 'usePresence'] }], dts: false })],
  server: { host: '127.0.0.1', port: 39000 + Math.floor(Math.random() * 10000), fs: { allow: [root] } },
})
let browser
const cleanup = async () => { await browser?.close(); await server.close() }
process.once('SIGINT', async () => { await cleanup(); process.exit(130) })
process.once('SIGTERM', async () => { await cleanup(); process.exit(143) })
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  await page.goto(server.resolvedUrls.local[0])
  await page.locator('button[aria-label="Chat"]').waitFor({ timeout: 5000 }).catch(async error => {
    console.error('Fixture startup:', errors, await page.evaluate(() => ({ html: document.body.innerHTML, desktop: window.fixture?.dock.desktop.value, width: window.fixture?.dock.width.value })))
    throw error
  })
  const inbox = page.locator('.moh-chat-dock-inbox')
  await page.locator('button[aria-label="Chat"]').click()
  await inbox.waitFor({ state: 'visible' })
  await page.waitForFunction(() => document.querySelectorAll('.moh-divide > a').length === 3)
  await page.waitForTimeout(350)
  // Hidden rows refresh while the persistent workspace is mounted. Reveal and
  // refresh in the same tick, then sample every frame through the window motion.
  await page.locator('button[aria-label="Chat"]').click()
  await inbox.waitFor({ state: 'hidden' })
  await page.evaluate(() => window.fixture.refresh())
  const samples = await page.evaluate(async () => {
    window.fixture.dock.listExpanded.value = true
    await window.fixture.refresh()
    const frames = []
    const start = performance.now()
    while (performance.now() - start < 360) {
      await new Promise(requestAnimationFrame)
      const parent = document.querySelector('.moh-chat-dock-inbox')
      frames.push({ windowTransform: getComputedStyle(parent).transform, width: parent.getBoundingClientRect().width, rows: [...document.querySelectorAll('.moh-divide > a')].map(row => ({ transform: getComputedStyle(row).transform, x: row.getBoundingClientRect().x - parent.getBoundingClientRect().x })) })
    }
    return frames
  })
  assert(samples.some(frame => frame.windowTransform !== 'none'), 'inbox window should move')
  assert(samples.every(frame => frame.width === 320 && frame.rows.every(row => row.transform === 'none' && row.x >= 0 && row.x < 5)), `inbox rows stay fixed inside the moving window: ${JSON.stringify(samples.find(frame => frame.width !== 320 || frame.rows.some(row => row.transform !== 'none' || row.x < 0 || row.x >= 5)))}`)
  await page.evaluate(() => { window.fixture.dock.open('a'); window.fixture.dock.open('b') })
  const windows = await page.locator('.moh-chat-dock > .moh-chat-dock-window:not(.moh-chat-dock-inbox)').evaluateAll(elements => elements.map(element => ({ id: element.id, x: element.getBoundingClientRect().x })))
  assert.deepEqual(windows.map(window => window.id), ['moh-chat-dock-slot-b', 'moh-chat-dock-slot-a'])
  assert(windows[0].x < windows[1].x, 'newest window should be on the left')
  await page.getByRole('button', { name: 'Minimize Chat', exact: true }).first().click()
  const timing = await page.evaluate(() => document.querySelector('body > [aria-hidden="true"]')?.getAnimations()[0]?.effect.getTiming())
  assert.equal(timing.duration, 420)
  assert.equal(timing.easing, 'cubic-bezier(0.4, 0, 0.2, 1)')
  // Interrupt before completion; cancellation must remove the shell immediately.
  await page.getByRole('button', { name: 'Restore Chat', exact: true }).click()
  assert.equal(await page.locator('body > [aria-hidden="true"]').count(), 0)
  await page.waitForTimeout(350)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('button[aria-label="Chat"]').click()
  await inbox.waitFor({ state: 'hidden' })
  await page.locator('button[aria-label="Chat"]').click()
  assert.equal(await inbox.evaluate(element => getComputedStyle(element).transitionDuration), '0s')
  await page.getByRole('button', { name: 'Minimize Chat', exact: true }).first().click()
  assert.equal(await page.locator('body > [aria-hidden="true"]').count(), 0)
  assert.deepEqual(errors, [])
  console.warn('Chat dock browser checks passed: stable rows on reveal/refresh, whole-window motion, left ordering, 420ms minimize, interruption cleanup, reduced motion.')
} finally {
  await cleanup()
}
