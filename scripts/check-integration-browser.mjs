// Isolated, bounded browser fixtures. Does not connect to MOH or any provider.
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwind from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const root = resolve(import.meta.dirname, '..')
const server = await createServer({ configFile: false, root: resolve(root, 'tests/integration-browser'),
  resolve: { alias: { '~': root } },
  plugins: [vue(), tailwind(), AutoImport({ imports: ['vue', { [resolve(root, 'tests/integration-browser/fixture-api.ts')]: ['useState', 'useApiClient', 'definePageMeta'] }], dts: false })],
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } } })
let browser
const cleanup = async () => { await browser?.close(); await server.close() }
process.once('SIGINT', async () => { await cleanup(); process.exit(130) })
process.once('SIGTERM', async () => { await cleanup(); process.exit(143) })
try {
  await server.listen()
  const url = server.resolvedUrls.local[0]
  if (process.argv.includes('--serve')) {
    console.warn(`Fixture gallery: ${url} (closes in 15 minutes; Ctrl-C to stop)`)
    await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000))
  } else {
    browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/*', async route => {
      const host = new URL(route.request().url()).hostname
      if (host === 'preview-fixture.example') {
        await new Promise(resolve => setTimeout(resolve, 350))
        return route.fulfill({ path: resolve(root, 'tests/fixtures/integration-banner.png'), contentType: 'image/png' })
      }
      return host === '127.0.0.1' ? route.continue() : route.abort()
    })
    await page.goto(url)
    await page.getByText('Spending controls', { exact: true }).waitFor()
    await page.locator('#fixture').focus()
    const preview = page.getByRole('dialog', { name: '@fixture_man preview' })
    await preview.getByRole('link', { name: 'Message on X' }).waitFor()
    assert.equal(await preview.locator('img').evaluate(image => image.complete && image.naturalWidth > 0), true)
    await page.keyboard.press('Tab')
    await page.getByRole('dialog').last().focus(); await page.keyboard.press('Escape'); await page.getByRole('dialog').last().waitFor({ state: 'hidden' })
    await preview.waitFor({ state: 'hidden' })
    await page.locator('#no-dm').hover()
    await preview.getByText('James Example').waitFor()
    await preview.getByText('Message on X').waitFor({ state: 'hidden' })
    await page.getByRole('dialog').last().focus(); await page.keyboard.press('Escape'); await page.getByRole('dialog').last().waitFor({ state: 'hidden' })
    await page.locator('#expired').hover()
    await preview.getByText('View on X').waitFor()
    await page.getByRole('dialog').last().focus(); await page.keyboard.press('Escape'); await page.getByRole('dialog').last().waitFor({ state: 'hidden' })
    await page.locator('#state').hover()
    const state = page.getByRole('dialog', { name: 'Virginia preview' })
    await state.getByText('+94').waitFor()
    assert.equal(await state.locator('[aria-label^="Member"]').count(), 6)
    await page.getByRole('dialog').last().focus(); await page.keyboard.press('Escape'); await page.getByRole('dialog').last().waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: 'Review X publication', exact: true }).first().click()
    await page.getByRole('button', { name: 'Add thread part' }).click()
    await page.locator('#x-part-1').fill('The second part.')
    await page.getByRole('button', { name: 'Queue X publication', exact: true }).click()
    await page.getByText('Queued for X. Follow delivery status on your post.').waitFor()
    await page.getByRole('dialog').last().focus(); await page.keyboard.press('Escape'); await page.getByRole('dialog').last().waitFor({ state: 'hidden' })
    await page.getByRole('button', { name: 'Review X publication', exact: true }).nth(1).click()
    await page.getByRole('link', { name: 'Confirmed X part 2' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Queue X publication', exact: true }).count(), 0)
    await page.getByRole('dialog').last().focus(); await page.keyboard.press('Escape'); await page.getByRole('dialog').last().waitFor({ state: 'hidden' })
    await page.locator('#control-reason').fill('Local fixture spending test')
    await page.getByRole('button', { name: 'Save controls' }).click()
    await page.getByRole('button', { name: /X · create · uncertain/ }).click()
    await page.locator('#charge').fill('0.015')
    await page.locator('#evidence').fill('Synthetic provider invoice confirms charge')
    await page.getByRole('button', { name: 'Record charge' }).click()
    await page.getByText('No pending operations').waitFor()
    const calls = await page.evaluate(() => window.fixtureCalls)
    assert.equal(calls.find(c => c.path.endsWith('/reconcile')).body.chargedMicros, 15000)
    assert.equal(calls.find(c => c.body?.parts)?.body.parts.length, 2)
    await mkdir('/tmp/moh-integration-browser', { recursive: true })
    for (const [width, theme] of [[390, 'light'], [1100, 'dark']]) {
      await page.setViewportSize({ width, height: 900 })
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), theme === 'dark')
      await page.locator('#fixture').hover()
      await preview.getByRole('link', { name: 'Message on X' }).waitFor()
      await page.screenshot({ path: `/tmp/moh-integration-browser/${theme}.png` })
      assert.equal(await preview.evaluate(el => el.getBoundingClientRect().right <= window.innerWidth), true)
      await page.getByRole('dialog').last().focus(); await page.keyboard.press('Escape'); await page.getByRole('dialog').last().waitFor({ state: 'hidden' })
    }
    for (const theme of ['light', 'dark']) {
      await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), theme === 'dark')
      for (const site of ['pickax.com', 'rumble.com']) {
        await page.locator(`[id="${site}"]`).hover()
        const card = page.getByRole('dialog', { name: `${site} preview` })
        await card.getByText('A public biography from the original website.').waitFor()
        assert.equal(await card.getByText('Preview unavailable').count(), 0)
        assert.equal(await card.locator('a').count(), 1)
        if (site === 'pickax.com') await card.getByText('111 Followers').waitFor()
        const landed = await card.boundingBox()
        assert.equal(await card.locator('img').count(), site === 'pickax.com' ? 2 : 1)
        for (const img of await card.locator('img').all()) {
          await img.evaluate(image => image.decode())
          assert.equal(await img.evaluate(image => image.naturalWidth > 0), true)
        }
        const loaded = await card.boundingBox()
        assert.equal(loaded.x, landed.x)
        assert.equal(loaded.y, landed.y)
        assert.equal(loaded.height, landed.height)
        await card.hover()
        assert.equal(await card.isVisible(), true)
        await page.screenshot({ path: `/tmp/moh-integration-browser/${site}-${theme}.png` })
        await card.focus(); await page.keyboard.press('Escape'); await card.waitFor({ state: 'hidden' })
      }
    }
    assert.deepEqual(errors, [])
    console.warn('Browser fixtures passed: public/private/expired previews, avatar cap, thread queue, partial thread, admin controls/reconciliation, compact light and wide dark.')
  }
} finally { await cleanup() }
