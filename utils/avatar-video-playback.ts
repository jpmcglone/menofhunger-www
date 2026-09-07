import { AvatarVideoCache } from './avatar-video-cache'
import type { AvatarVideoDto } from '~/types/api-contracts.gen'

const cache = new AvatarVideoCache()
const entries = new Map<string, Entry>()
const positions = new Map<string, number>()
type Entry = {
  asset: AvatarVideoDto
  admitted: boolean
  video: HTMLVideoElement
  canvases: Set<HTMLCanvasElement>
  loading?: Promise<void>
  blobUrl?: string
  callback?: number
  disposal?: ReturnType<typeof setTimeout>
  failedUntil?: number
  touched?: number
}

function draw(entry: Entry) {
  if (!entry.admitted || entry.video.readyState < 2) return
  const now = Date.now()
  if (now - (entry.touched ?? 0) >= 60_000) {
    entry.touched = now
    cache.touch(entry.asset.url)
  }
  for (const canvas of entry.canvases) {
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) continue
    context.drawImage(entry.video, 0, 0, canvas.width, canvas.height)
    canvas.style.opacity = '1'
  }
}

function schedule(entry: Entry) {
  if (!entry.admitted || !entry.canvases.size || entry.callback != null || document.hidden) return
  entry.callback = entry.video.requestVideoFrameCallback(() => {
    entry.callback = undefined
    draw(entry)
    schedule(entry)
  })
}

function stop(entry: Entry) {
  entry.video.pause()
  if (entry.callback != null) entry.video.cancelVideoFrameCallback(entry.callback)
  entry.callback = undefined
}

function attachSource(entry: Entry) {
  const canvas = entry.canvases.values().next().value
  // Keep the one native source in an actual visible avatar, not a display:none player.
  if (canvas?.parentElement && entry.video.parentElement !== canvas.parentElement) canvas.parentElement.prepend(entry.video)
}

async function play(entry: Entry, asset: AvatarVideoDto) {
  if (entry.failedUntil && entry.failedUntil > Date.now()) return
  if (!entry.blobUrl) {
    entry.loading ??= cache.load(asset.url).then(blob => {
      if (!entry.admitted) return
      entry.blobUrl = URL.createObjectURL(blob)
      entry.video.src = entry.blobUrl
      entry.video.addEventListener('loadedmetadata', () => { entry.video.currentTime = positions.get(asset.id) ?? 0 }, { once: true })
    }).finally(() => { entry.loading = undefined })
    await entry.loading
  }
  if (!entry.admitted || !entry.canvases.size || document.hidden) return
  attachSource(entry)
  await entry.video.play()
  schedule(entry)
}

function rebalance() {
  let active = 0
  for (const entry of [...entries.values()].sort((a, b) => a.asset.id.localeCompare(b.asset.id))) {
    const admitted = entry.canvases.size > 0 && active < 12
    if (admitted) active++
    entry.admitted = admitted
    if (!admitted) {
      stop(entry); entry.video.remove()
      if (entry.canvases.size && entry.blobUrl) {
        positions.set(entry.asset.id, entry.video.currentTime)
        while (positions.size > 256) positions.delete(positions.keys().next().value!)
        entry.video.removeAttribute('src'); entry.video.load()
        URL.revokeObjectURL(entry.blobUrl); entry.blobUrl = undefined
      }
      for (const canvas of entry.canvases) canvas.style.opacity = '0'
      continue
    }
    draw(entry)
    void play(entry, entry.asset).catch(() => {
      entry.failedUntil = Date.now() + 30_000
      stop(entry); entry.video.remove()
      for (const canvas of entry.canvases) canvas.style.opacity = '0'
    })
  }
}

/** A subscriber owns no decoder and never seeks the shared source. */
export function subscribeAvatarVideo(asset: AvatarVideoDto, canvas: HTMLCanvasElement): () => void {
  if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) return () => {}
  let entry = entries.get(asset.id)
  if (!entry) {
    const video = document.createElement('video')
    video.muted = true; video.defaultMuted = true; video.playsInline = true; video.loop = true
    video.setAttribute('aria-hidden', 'true')
    video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none;'
    entry = { asset, admitted: false, video, canvases: new Set() }
    entries.set(asset.id, entry)
  }
  const current = entry
  clearTimeout(current.disposal)
  current.canvases.add(canvas)
  rebalance()
  return () => {
    current.canvases.delete(canvas)
    canvas.style.opacity = '0'
    rebalance()
    if (current.canvases.size) { attachSource(current); return }
    stop(current)
    current.video.remove()
    // Pause/resume preserves currentTime during ordinary scrolling; idle disposal frees decoder memory.
    current.disposal = setTimeout(() => {
      if (current.canvases.size) return
      const dispose = () => {
        if (current.canvases.size) return
        positions.delete(asset.id)
        positions.set(asset.id, current.video.currentTime)
        while (positions.size > 256) positions.delete(positions.keys().next().value!)
        current.video.removeAttribute('src'); current.video.load()
        if (current.blobUrl) URL.revokeObjectURL(current.blobUrl)
        entries.delete(asset.id)
      }
      if (current.loading) void current.loading.then(dispose, dispose)
      else dispose()
    }, 10_000)
  }
}
