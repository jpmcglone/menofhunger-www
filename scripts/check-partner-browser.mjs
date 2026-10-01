/** Isolated production-preview interaction test. No real accounts or provider posts. */
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
const probe = createServer()
await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve))
const port = probe.address().port
await new Promise(resolve => probe.close(resolve))
const base = `http://127.0.0.1:${port}`
const child = spawn(process.execPath, ['.output/server/index.mjs'], { env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', NUXT_API_BASE_URL: 'http://127.0.0.1:1/v1', NUXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:1/v1' }, stdio: 'ignore' })
let browser
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  child.kill('SIGTERM')
  void browser?.close().finally(() => process.exit(130))
})
try {
  for (let i = 0; i < 100; i++) {
    try { const res = await fetch(`${base}/developers`); if (res.ok) break } catch { /* Preview server is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (/hydration/i.test(message.text())) errors.push(message.text()) })
  // Fail closed for every request outside the isolated preview.
  await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort())
  await page.goto(`${base}/developers`)
  await page.getByRole('heading', { name: 'Connect Pickax to Men of Hunger', exact: true }).waitFor()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true)
  await page.getByRole('link', { name: 'runnable TypeScript example' }).waitFor()
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme })
    await page.evaluate(theme => localStorage.setItem('color-mode', theme), colorScheme)
    await page.reload()
    await page.waitForFunction(theme => document.documentElement.classList.contains(theme), colorScheme)
    await page.screenshot({ path: `/tmp/moh-partner-guide-${colorScheme}.png`, fullPage: false })
  }
  await page.goto(`${base}/connect/pickax?error=access_denied`)
  await page.getByText('Pickax authorization was declined. Your MOH read connection is unchanged.').waitFor()
  assert.equal(await page.getByRole('button', { name: 'Continue to Pickax' }).count(), 0)
  assert.ok(page.url().includes('access_denied'))
  await page.goto(`${base}/connect/partner?interaction=invalid`)
  assert.equal(await page.locator('a[href*="/oauth/interaction/"]').count(), 0)
  assert.deepEqual(errors, [])
  console.warn('Partner browser: public guide light/dark, narrow viewport, denial without loops, invalid continuation and hydration passed.')
} finally { await browser?.close(); child.kill('SIGTERM') }
