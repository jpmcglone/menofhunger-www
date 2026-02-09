import fs from 'node:fs'
import path from 'node:path'

/**
 * Dev helper: bump the push service worker cache version to force cache purge.
 * This avoids "stuck" assets (e.g. /sounds/message.mp3) when a SW cached them.
 *
 * Only intended for local dev flows (wired into `npm run dev:clean`).
 */

const swPath = path.resolve(process.cwd(), 'public', 'sw-push.js')
const src = fs.readFileSync(swPath, 'utf8')

const re = /self\.__MOH_SW_VERSION\s*=\s*'([^']+)'\s*/m
const m = src.match(re)
if (!m) {
  console.error(`[bump-sw-version] Could not find __MOH_SW_VERSION in ${swPath}`)
  process.exit(1)
}

const prev = m[1]
const next = `moh-sw-dev-${Date.now()}`
if (prev === next) process.exit(0)

const out = src.replace(re, `self.__MOH_SW_VERSION = '${next}'`)
fs.writeFileSync(swPath, out, 'utf8')
console.log(`[bump-sw-version] Updated SW version: ${prev} -> ${next}`)

