import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { build } from 'esbuild'
import { chromium, webkit } from 'playwright'

// Bounded, isolated browser check; never starts or modifies the user's dev servers.
const directory = await mkdtemp(join(tmpdir(), 'avatar-playback-'))
let browser, server, page
let downloads = 0
try {
  execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x320:rate=24', '-t', '2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', '-movflags', '+faststart', join(directory, 'avatar.mp4')], { timeout: 30_000 })
  await build({ entryPoints: ['utils/avatar-video-playback.ts'], bundle: true, format: 'esm', outfile: join(directory, 'playback.js') })
  const script = await readFile(join(directory, 'playback.js'))
  await build({ entryPoints: ['utils/avatar-video-storage.ts'], bundle: true, format: 'esm', outfile: join(directory, 'storage.js') })
  const storageScript = await readFile(join(directory, 'storage.js'))
  const mp4 = await readFile(join(directory, 'avatar.mp4'))
  server = createServer((request, response) => {
    if (request.url === '/storage.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(storageScript); return }
    if (request.url === '/playback.js') { response.setHeader('Content-Type', 'text/javascript'); response.end(script); return }
    if (request.url.startsWith('/avatar.mp4')) { if (request.url === '/avatar.mp4') downloads++; response.setHeader('Content-Type', 'video/mp4'); response.end(mp4); return }
    response.setHeader('Content-Type', 'text/html')
    response.end(`<style>.avatar{position:relative;width:64px;height:64px;display:inline-block;overflow:hidden}.avatar canvas{position:relative;width:100%;height:100%}</style>
      <div id="avatars"></div><script type="module">
      import {subscribeAvatarVideo} from '/playback.js';
      window.mediaErrors=[];document.addEventListener('error',event=>{if(event.target instanceof HTMLVideoElement)window.mediaErrors.push(event.target.error?.message);},true);
      const asset={id:'v1',url:location.origin+'/avatar.mp4',durationMs:2000,width:320,height:320};
      window.stops=[];window.mount=(count,videoAsset=asset)=>{for(let i=0;i<count;i++){const host=document.createElement('div');host.className='avatar';const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;host.append(canvas);document.querySelector('#avatars').append(host);stops.push(subscribeAvatarVideo(videoAsset,canvas));}};
      window.unmount=()=>{stops.forEach(stop=>stop());stops=[];document.querySelector('#avatars').replaceChildren();};
      window.framesEqual=()=>{const frames=[...document.querySelectorAll('canvas')].map(c=>c.toDataURL());return frames.length>1 && new Set(frames).size===1;};
      mount(30);window.ready=true;</script>`)
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const origin = `http://127.0.0.1:${server.address().port}`
  const context = await (process.env.AVATAR_TEST_BROWSER === 'webkit' ? webkit : chromium).launchPersistentContext(join(directory, 'browser-profile'), { headless: true })
  browser = context
  page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()) })
  await page.goto(origin)
  await page.waitForFunction(() => window.ready && document.querySelector('canvas')?.style.opacity === '1')
  assert.equal(downloads, 1)
  assert.equal(await page.locator('video').count(), 1)
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(400)
    assert.equal(await page.evaluate(() => window.framesEqual()), true, 'Duplicate canvases must receive the same frame, including across loops')
  }
  await page.evaluate(() => window.mount(5))
  await page.waitForTimeout(150)
  assert.equal(await page.evaluate(() => window.framesEqual()), true)
  assert.equal(downloads, 1)
  await page.evaluate(() => { window.source = document.querySelector('video'); window.unmount() })
  assert.equal(await page.evaluate(() => window.source.paused), true)
  await page.evaluate(() => window.mount(30))
  await page.waitForFunction(() => document.querySelector('canvas')?.style.opacity === '1')
  assert.equal(downloads, 1)
  await page.reload()
  await page.waitForFunction(() => document.querySelector('canvas')?.style.opacity === '1')
  assert.equal(downloads, 1, 'Persistent bytes must survive page reload')
  const second = await context.newPage()
  await second.goto(origin)
  await second.waitForFunction(() => document.querySelector('canvas')?.style.opacity === '1')
  assert.equal(downloads, 1, 'A second tab must reuse cached bytes')
  await page.bringToFront()
  await page.evaluate(() => {
    window.unmount()
    for (let i = 0; i < 20; i++) window.mount(1, { id: `unique-${i}`, url: `${location.origin}/avatar.mp4?v=${i}`, durationMs: 2000, width: 320, height: 320 })
  })
  await page.waitForFunction(() => document.querySelectorAll('video').length === 12)
  await page.waitForFunction(() => [...document.querySelectorAll('canvas')].filter(canvas => canvas.style.opacity === '1').length === 12)
  assert.equal(await page.locator('video').count(), 12, 'Twenty distinct avatars must respect the shared source budget')
  assert.equal(await page.locator('canvas[style*="opacity: 1"]').count(), 12, 'Excess avatars must retain their posters')
  const eviction = await page.evaluate(async () => {
    const { IndexedAvatarVideoStorage } = await import('/storage.js')
    const storage = new IndexedAvatarVideoStorage()
    // Remove the test page's persisted bytes while its Blob sources are still playing.
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('moh-avatar-video-v1', 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        const tx = db.transaction('videos', 'readwrite')
        tx.objectStore('videos').clear()
        tx.oncomplete = () => { db.close(); resolve() }
        tx.onerror = tx.onabort = () => { db.close(); reject(tx.error) }
      }
    })
    const realNow = Date.now
    let time = realNow() + 60_000
    Date.now = () => ++time
    try {
      const blob = new Blob(['mp4-test'], { type: 'video/mp4' })
      for (let i = 0; i < 256; i++) await storage.put(`lru-${i}`, blob)
      await storage.touch('lru-0')
      await storage.put('lru-new', blob)
      const oldestRemoved = await storage.get('lru-1') === undefined
      const reusedRetained = (await storage.get('lru-0'))?.size === 8
      return { oldestRemoved, reusedRetained }
    } finally { Date.now = realNow }
  })
  assert.deepEqual(eviction, { oldestRemoved: true, reusedRetained: true }, 'Persistent eviction must respect last use')
  const beforeEvictionFrame = await page.locator('canvas').first().evaluate(canvas => canvas.toDataURL())
  await page.waitForTimeout(700)
  const afterEvictionFrame = await page.locator('canvas').first().evaluate(canvas => canvas.toDataURL())
  assert.notEqual(afterEvictionFrame, beforeEvictionFrame, 'Evicting persisted bytes must not interrupt a live Blob player')
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ passed: true, copies: 35, nativeSourcesPerPage: 1, mp4Downloads: downloads,
    checks: ['matching frames across loops', 'new subscriber joins current frame', 'pause on last unsubscribe', 'warm remount', 'persistent reload', 'cross-tab cache', '20 distinct avatars respect 12-source budget', 'LRU eviction preserves recent reuse', 'active playback survives disk eviction'] }))
} catch (error) {
  console.error('Avatar browser state:', await page?.evaluate(() => ({
    hidden: document.hidden, mediaErrors: window.mediaErrors,
    videos: [...document.querySelectorAll('video')].map(video => ({ paused: video.paused, readyState: video.readyState, time: video.currentTime, error: video.error?.message, local: video.src.startsWith('blob:') })),
  })).catch(() => null))
  throw error
} finally {
  await browser?.close()
  if (server) await new Promise(resolve => server.close(resolve))
  await rm(directory, { recursive: true, force: true })
}
