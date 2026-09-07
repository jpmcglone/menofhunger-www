import { IndexedAvatarVideoStorage, type AvatarVideoStorage } from './avatar-video-storage'

const MAX_FILE_BYTES = 512 * 1024

/** Complete MP4 bytes only: media elements never receive a network URL. */
export class AvatarVideoCache {
  constructor(private readonly storage: AvatarVideoStorage = new IndexedAvatarVideoStorage()) {}

  private readonly pending = new Map<string, Promise<Blob>>()
  private readonly memory = new Map<string, Blob>()
  private readonly touched = new Map<string, number>()

  touch(url: string): void {
    if (this.memory.has(url)) this.touched.set(url, Date.now())
    void this.storage.touch(url).catch(() => {})
  }

  load(url: string): Promise<Blob> {
    const hit = this.memory.get(url)
    if (hit) {
      this.memory.delete(url)
      this.memory.set(url, hit)
      // Refresh disk recency without blocking playback or writing on every duplicate mount.
      if (Date.now() - (this.touched.get(url) ?? 0) >= 60_000) {
        this.touched.set(url, Date.now())
        this.touch(url)
      }
      return Promise.resolve(hit)
    }
    const pending = this.pending.get(url)
    if (pending) return pending
    const task = this.loadOnce(url).then(blob => {
      this.memory.set(url, blob)
      this.touched.set(url, Date.now())
      while (this.memory.size > 32) {
        const oldest = this.memory.keys().next().value!
        this.memory.delete(oldest)
        this.touched.delete(oldest)
      }
      return blob
    }).finally(() => this.pending.delete(url))
    this.pending.set(url, task)
    return task
  }

  private async loadOnce(url: string): Promise<Blob> {
    const read = async () => {
      const cached = await this.storage.get(url).catch(() => undefined)
      if (cached) return cached
      const response = await fetch(url, { mode: 'cors', credentials: 'omit', signal: AbortSignal.timeout(30_000) })
      if (response.status !== 200 || !response.headers.get('content-type')?.includes('video/mp4')) throw new Error('Avatar video unavailable.')
      if (Number(response.headers.get('content-length')) > MAX_FILE_BYTES) throw new Error('Avatar video too large.')
      const reader = response.body?.getReader()
      if (!reader) throw new Error('Avatar video unavailable.')
      const chunks: Uint8Array<ArrayBuffer>[] = []
      let size = 0
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > MAX_FILE_BYTES) throw new Error('Avatar video too large.')
          chunks.push(new Uint8Array(value))
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
      if (!size) throw new Error('Empty avatar video.')
      const blob = new Blob(chunks, { type: 'video/mp4' })
      await this.storage.put(url, blob).catch(() => { /* Active instances still share memory if storage is unavailable. */ })
      return blob
    }
    // Recheck persistent bytes inside a cross-tab lock, including cold simultaneous mounts.
    return navigator.locks ? navigator.locks.request(`avatar-video:${url}`, read) : read()
  }
}
