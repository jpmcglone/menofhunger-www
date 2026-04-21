/**
 * Chunk load error recovery.
 *
 * Symptom: a JS chunk fails to load with one of:
 *   - "Importing a module script failed" (Mobile Safari / iOS)
 *   - "Failed to fetch dynamically imported module" (Chrome / Firefox)
 *   - "error loading dynamically imported module" (Vite generic)
 *   - "Unable to preload CSS"
 *
 * Most common cause: the user's browser tab (or iOS PWA shell) is running JS that
 * still references chunk hashes from a previous deploy. Those /_nuxt/* files no
 * longer exist on the server → 404 → import rejects → page fails to navigate or
 * mount, and the user sees a blank screen.
 *
 * Recovery is two-stage so we can rescue users in both the easy and the stuck cases:
 *
 *   Stage 1 — soft reload (`window.location.reload()`).
 *     Fixes the common case: HTML is `cache-control: no-store`, so a reload pulls
 *     fresh HTML referencing the current chunk hashes. Most users recover here.
 *
 *   Stage 2 — nuke caches + unregister SW + reload.
 *     If we land back here within `WINDOW_MS`, stage 1 didn't work — usually the
 *     push-notification Service Worker (`public/sw-push.js`) is `cacheFirst` for
 *     `/_nuxt/*` and is serving a broken chunk from its cache, OR the browser's
 *     own HTTP cache is mis-serving an asset. Clear both, then reload.
 *
 * After two failed attempts in the same window we stop, to avoid a reload loop in
 * the (rare) case of a chunk that genuinely 5xx's on the server. The counter
 * resets a few seconds after a successful mount.
 */

const STATE_KEY = 'moh.chunk-recovery'
const WINDOW_MS = 60_000
const SUCCESS_RESET_MS = 5_000
const MAX_ATTEMPTS = 2

type RecoveryState = { at: number; attempt: number }

function readState(): RecoveryState {
  try {
    const raw = sessionStorage.getItem(STATE_KEY)
    if (!raw) return { at: 0, attempt: 0 }
    const obj = JSON.parse(raw) as Partial<RecoveryState>
    return { at: Number(obj?.at) || 0, attempt: Number(obj?.attempt) || 0 }
  } catch {
    return { at: 0, attempt: 0 }
  }
}

function writeState(s: RecoveryState): void {
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(s))
  } catch {
    // sessionStorage may be unavailable in private-browsing — ignore
  }
}

function clearState(): void {
  try {
    sessionStorage.removeItem(STATE_KEY)
  } catch {
    // ignore
  }
}

function isChunkLoadError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase()
  return (
    msg.includes('importing a module script failed') ||
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('unable to preload css') ||
    /loading (css )?chunk \d+ failed/.test(msg)
  )
}

async function nukeCachesAndSW(): Promise<void> {
  // Best-effort wipe of anything that might be re-serving a broken `/_nuxt/*`
  // asset. Wrapped individually so one failure doesn't block the others.
  try {
    if ('caches' in self) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)))
    }
  } catch {
    // ignore
  }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.unregister().catch(() => false)))
    }
  } catch {
    // ignore
  }
}

let recovering = false

async function tryRecover(): Promise<void> {
  if (recovering) return
  recovering = true
  try {
    const state = readState()
    const now = Date.now()
    const inWindow = now - state.at < WINDOW_MS

    if (inWindow && state.attempt >= MAX_ATTEMPTS) {
      // Give up — repeated failures inside the cooldown means a real broken
      // build (or a chunk the user's network keeps blocking). Don't loop.
      return
    }

    const nextAttempt = inWindow ? state.attempt + 1 : 1
    writeState({ at: now, attempt: nextAttempt })

    if (nextAttempt >= 2) {
      // Stage 2: stage 1 didn't recover us — escalate.
      await nukeCachesAndSW()
    }

    window.location.reload()
  } finally {
    // `recovering` stays true until the page actually unloads; if reload was
    // skipped we still don't want re-entry within the same tick.
    setTimeout(() => {
      recovering = false
    }, 1000)
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  // Nuxt's canonical hook for chunk-load failures during route navigation
  // (Nuxt 3.10+). This is more reliable than `app:error` for this specific
  // failure mode and fires before the user sees a broken page.
  nuxtApp.hook('app:chunkError', () => {
    void tryRecover()
  })

  // Belt: also catch chunk errors that surface through the general `app:error`
  // pathway (e.g. errors thrown from inside a page setup that synchronously
  // imported a missing module).
  nuxtApp.hook('app:error', (err) => {
    if (isChunkLoadError(err)) void tryRecover()
  })

  // Suspenders: unhandled promise rejections from chunks imported outside Vue's
  // component tree (e.g. dynamic imports inside event handlers, composables
  // called from non-Nuxt contexts).
  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault()
      void tryRecover()
    }
  })

  // <script> / <link> load failures don't bubble — we have to listen in the
  // capture phase. Some iOS Safari versions surface a missing module chunk as
  // a `<script>` error event before (or instead of) rejecting the import().
  window.addEventListener(
    'error',
    (event) => {
      const target = event.target as HTMLElement | null
      if (!target || !('tagName' in target)) return
      const tag = target.tagName
      if (tag !== 'SCRIPT' && tag !== 'LINK') return
      const src =
        (target as HTMLScriptElement).src || (target as HTMLLinkElement).href || ''
      if (src.includes('/_nuxt/')) void tryRecover()
    },
    true,
  )

  // Reset the attempt counter after a clean mount. If we make it past
  // SUCCESS_RESET_MS without another chunk error, the page is healthy and any
  // future chunk errors deserve a fresh stage-1 attempt rather than going
  // straight to the nuclear option.
  nuxtApp.hook('app:mounted', () => {
    setTimeout(() => {
      const s = readState()
      if (s.attempt > 0 && Date.now() - s.at >= SUCCESS_RESET_MS) clearState()
    }, SUCCESS_RESET_MS)
  })
})
