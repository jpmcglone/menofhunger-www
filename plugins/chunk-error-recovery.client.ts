/**
 * Chunk load error recovery.
 *
 * When a JS chunk fails to load ("Importing a module script failed" / "Failed to fetch
 * dynamically imported module"), the most common cause in production is stale HTML: the
 * user's browser (or iOS PWA shell) is serving a cached HTML document that references
 * old chunk hashes, but those old chunk files no longer exist on the server after a new
 * deploy.
 *
 * Recovery strategy: reload the page once so the browser fetches fresh HTML with the
 * current chunk hashes. A sessionStorage timestamp guards against reload loops (we wait
 * at least 30 s between auto-reloads so a genuinely broken chunk doesn't spin forever).
 */

const RELOAD_KEY = 'moh.chunk-reload-at'
const RELOAD_COOLDOWN_MS = 30_000

function isChunkLoadError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase()
  return (
    msg.includes('importing a module script failed') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('unable to preload css')
  )
}

function tryReload(): void {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0)
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()))
    window.location.reload()
  } catch {
    // sessionStorage may be unavailable in some private-browsing contexts — ignore
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  // Hook into Nuxt's error system (fires for errors caught during page navigation /
  // async component loading, including chunk import failures).
  nuxtApp.hook('app:error', (err) => {
    if (isChunkLoadError(err)) tryReload()
  })

  // Belt-and-suspenders: also listen for unhandled rejections that escape Nuxt's handler
  // (e.g. chunks imported outside of Vue's component tree).
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault()
      tryReload()
    }
  })
})
