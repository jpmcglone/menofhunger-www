// Real audience pickers, PrimeVue dialog, Tiptap editor and IndexedDB draft storage.
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { chromium } from 'playwright'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'

const root = resolve(import.meta.dirname, '..')
const server = await createServer({
  configFile: false, root: resolve(root, 'tests/composer-browser'),
  resolve: { alias: { '~': root } },
  plugins: [vue(), AutoImport({ imports: ['vue'], dts: false })],
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } },
})
let browser
const cleanup = async () => { await browser?.close(); await server.close() }
process.once('SIGINT', async () => { await cleanup(); process.exit(130) })
process.once('SIGTERM', async () => { await cleanup(); process.exit(143) })
try {
  await server.listen()
  browser = await chromium.launch({ headless: true })
  for (const touch of [false, true]) {
    const page = await browser.newPage({ hasTouch: touch })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(server.resolvedUrls.local[0])
    const editor = page.locator('.tiptap')
    await editor.waitFor()
    await page.waitForFunction(() => document.querySelector('.tiptap')?.getAttribute('contenteditable') === 'true')
    const activate = locator => touch ? locator.tap() : locator.click()
    // Empty composers may restore another destination's saved draft without losing focus.
    await editor.focus()
    await activate(page.getByRole('button', { name: 'Post to: Public', exact: true }))
    await activate(page.getByRole('button', { name: /^Verified.*Verified members only$/ }))
    await page.waitForFunction(() => document.activeElement === document.querySelector('.tiptap'))
    await activate(page.getByRole('button', { name: 'Post to: Verified', exact: true }))
    await activate(page.getByRole('button', { name: /^Public.*Everyone can see this post$/ }))
    await page.waitForFunction(() => document.activeElement === document.querySelector('.tiptap'))
    await editor.fill('Keep https://example.com and this draft')
    const assertDraft = async focused => {
      await page.waitForFunction(expected => (document.activeElement === document.querySelector('.tiptap')) === expected, focused)
      assert.equal(await editor.innerText(), 'Keep https://example.com and this draft')
      assert.equal(await editor.getAttribute('contenteditable'), 'true')
    }
    await activate(page.getByRole('button', { name: 'Post to: Public', exact: true }))
    await activate(page.getByRole('button', { name: /^Verified.*Verified members only$/ }))
    await assertDraft(true)
    await activate(page.getByRole('button', { name: 'Post to: Verified', exact: true }))
    await activate(page.getByRole('tab', { name: 'Group' }))
    await page.getByRole('textbox', { name: 'Search your groups' }).fill('Daily')
    await activate(page.getByRole('button', { name: /^Daily Practice.*Members only$/ }))
    await assertDraft(true)
    await activate(page.getByRole('button', { name: 'Outside editor' }))
    await activate(page.getByRole('button', { name: 'Post to: Daily Practice', exact: true }))
    await activate(page.getByRole('tab', { name: 'Feed' }))
    await activate(page.getByRole('button', { name: /^Public.*Everyone can see this post$/ }))
    await assertDraft(false)
    assert.equal(await page.locator('#outside').evaluate(element => element === document.activeElement), true)
    // The simpler visibility-only picker has the same focus contract.
    await editor.focus()
    await activate(page.getByRole('button', { name: 'Select post visibility: Public', exact: true }))
    await activate(page.getByRole('button', { name: /^Verified.*Verified members only$/ }))
    await assertDraft(true)
    // Keyboard opening/dismissal returns to the trigger, without focusing the editor.
    const trigger = page.getByRole('button', { name: 'Select post visibility: Verified', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    await page.getByRole('dialog').waitFor()
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    await assertDraft(false)
    assert.equal(await trigger.evaluate(element => element === document.activeElement), true)
    assert.deepEqual(errors, [])
    await page.close()
  }
  console.warn('Composer browser checks passed: mouse/touch audience changes retain text and focus, group search, visibility-only picker, keyboard dismissal.')
} finally {
  await cleanup()
}
