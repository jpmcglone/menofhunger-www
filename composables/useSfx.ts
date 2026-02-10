type DecodeAudioData = (arrayBuffer: ArrayBuffer) => Promise<AudioBuffer>

function getDecodeAudioData(ctx: AudioContext): DecodeAudioData {
  // Safari historically used a callback-style decodeAudioData.
  return async (arrayBuffer: ArrayBuffer) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const maybePromise = (ctx.decodeAudioData as any)(arrayBuffer)
      if (maybePromise && typeof (maybePromise as any).then === 'function') {
        return await maybePromise
      }
    } catch {
      // fall through to callback version
    }
    return await new Promise<AudioBuffer>((resolve, reject) => {
      try {
        ctx.decodeAudioData(arrayBuffer, resolve, reject)
      } catch (e) {
        reject(e)
      }
    })
  }
}

let audioCtx: AudioContext | null = null
let decodeAudioDataFn: DecodeAudioData | null = null
let unlockListenersAdded = false
let sawUserGesture = false
const bufferCache = new Map<string, AudioBuffer>()
const arrayBufferCache = new Map<string, ArrayBuffer>()

function hasUserActivation(): boolean {
  if (!import.meta.client) return false
  // Chrome/Edge/Safari: user activation API (not universally supported).
  const ua = (navigator as any)?.userActivation
  if (ua && typeof ua.hasBeenActive === 'boolean') return Boolean(ua.hasBeenActive)
  return sawUserGesture
}

function getAudioContext(): AudioContext | null {
  if (!import.meta.client) return null
  if (audioCtx) return audioCtx
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
  if (!Ctx) return null
  audioCtx = new Ctx({ latencyHint: 'interactive' })
  decodeAudioDataFn = getDecodeAudioData(audioCtx as AudioContext)
  return audioCtx
}

async function ensureUnlocked(): Promise<boolean> {
  const ctx = getAudioContext()
  if (!ctx) return false
  const state = ((ctx as any).state ?? '') as string
  if (state === 'running') return true
  // Avoid calling `resume()` before a user gesture; Chrome will log a warning even if we catch.
  if (!hasUserActivation()) return false
  try {
    await ctx.resume()
  } catch {
    // ignore
  }
  const nextState = ((ctx as any).state ?? '') as string
  return nextState === 'running'
}

function addUnlockListenersOnce() {
  if (!import.meta.client) return
  if (unlockListenersAdded) return
  unlockListenersAdded = true

  const unlock = () => {
    sawUserGesture = true
    void ensureUnlocked()
  }

  // First user gesture is enough to allow audio.
  document.addEventListener('touchstart', unlock, { once: true, passive: true })
  document.addEventListener('click', unlock, { once: true, passive: true })
  document.addEventListener('keydown', unlock, { once: true, passive: true })
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer | null> {
  const u = (url ?? '').trim()
  if (!u) return null
  const cached = arrayBufferCache.get(u)
  if (cached) return cached
  try {
    const res = await fetch(u, { cache: 'force-cache' })
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    arrayBufferCache.set(u, buf)
    return buf
  } catch {
    return null
  }
}

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
  const u = (url ?? '').trim()
  if (!u) return null
  const cached = bufferCache.get(u)
  if (cached) return cached

  const ctx = getAudioContext()
  const decode = decodeAudioDataFn
  if (!ctx || !decode) return null

  try {
    const raw = await fetchArrayBuffer(u)
    if (!raw) return null
    const buf = await decode(raw.slice(0))
    bufferCache.set(u, buf)
    return buf
  } catch {
    return null
  }
}

export function useSfx() {
  async function preloadUrl(url: string) {
    if (!import.meta.client) return
    addUnlockListenersOnce()
    // Fetch into cache immediately; decode best-effort if AudioContext is available.
    await fetchArrayBuffer(url)
    void loadBuffer(url)
  }

  async function preloadUrls(urls: string[]) {
    if (!import.meta.client) return
    const list = Array.isArray(urls) ? urls : []
    await Promise.allSettled(list.map((u) => preloadUrl(u)))
  }

  async function playUrl(url: string, opts?: { volume?: number }) {
    if (!import.meta.client) return
    addUnlockListenersOnce()

    const ok = await ensureUnlocked()
    if (!ok) return

    const ctx = getAudioContext()
    if (!ctx) return

    const buf = await loadBuffer(url)
    if (!buf) return

    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    gain.gain.value = Math.max(0, Math.min(1, Number(opts?.volume ?? 0.9) || 0.9))
    source.buffer = buf
    source.connect(gain)
    gain.connect(ctx.destination)

    try {
      source.start(0)
    } catch {
      // ignore
    }
    source.onended = () => {
      try {
        source.disconnect()
        gain.disconnect()
      } catch {
        // ignore
      }
    }
  }

  return { playUrl, preloadUrl, preloadUrls }
}

