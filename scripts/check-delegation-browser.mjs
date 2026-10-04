// Bounded local fixture: no sign-in, provider calls, or production writes.
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwind from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { chromium } from 'playwright'
import { resolve } from 'node:path'
import { mkdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
const root = resolve(import.meta.dirname, '..')
const server = await createServer({ configFile: false, root: resolve(root, 'tests/delegation-browser'), resolve: { alias: { '~': root } }, plugins: [vue(), tailwind(), AutoImport({ imports: ['vue'], dts: false })], server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } } })
let browser
const cleanup = async () => { await browser?.close(); await server.close() }
process.once('SIGINT', async () => { await cleanup(); process.exit(130) })
process.once('SIGTERM', async () => { await cleanup(); process.exit(143) })
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1100, height: 1000 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort())
  await page.goto(server.resolvedUrls.local[0])
  await page.getByLabel('Start with').selectOption('founder')
  assert.equal(await page.getByLabel('Name', { exact: true }).inputValue(), 'Founder briefing')
  assert.equal(await page.getByLabel('Notify me').inputValue(), 'digest')
  await page.getByText('Run only when a condition is met', { exact: true }).click()
  await page.getByLabel('Condition', { exact: true }).selectOption('pending_reports')
  await page.getByLabel('At least').fill('3')
  await page.getByLabel('Cooldown in hours').fill('48')
  await page.getByRole('button', { name: 'Create job', exact: true }).click()
  const daily = JSON.parse(await page.locator('#saved').textContent())
  assert.deepEqual(daily.schedule.weekdays, [1,2,3,4,5])
  assert.equal(daily.schedule.condition.threshold, 3)
  await page.getByLabel('Schedule', { exact: true }).selectOption('monthly')
  await page.getByLabel('Day of month').fill('31')
  await page.getByRole('button', { name: 'Create job', exact: true }).click()
  const monthly = JSON.parse(await page.locator('#saved').textContent())
  assert.equal(monthly.schedule.dayOfMonth, 31)
  assert.equal(monthly.schedule.weekdays, undefined)
  await page.getByLabel('End at (optional)').fill('2020-01-01T09:00')
  await page.getByRole('button', { name: 'Create job', exact: true }).click()
  await page.getByRole('alert').getByText('Choose a future end time.').waitFor()
  await page.getByLabel('End at (optional)').fill('')
  await mkdir('/tmp/moh-delegation-browser', { recursive: true })
  for (const [width, theme] of [[390, 'light'], [1100, 'dark']]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.evaluate(dark => document.documentElement.classList.toggle('dark', dark), theme === 'dark')
    await page.screenshot({ path: `/tmp/moh-delegation-browser/${theme}.png`, fullPage: true })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  }
  assert.deepEqual(errors, [])
  console.warn('Passed: template, weekday schedule, monthly edit, condition, digest, invalid end date, and compact light/wide dark layouts.')
} finally { await cleanup() }
