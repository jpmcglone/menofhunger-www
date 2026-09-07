export interface AvatarVideoStorage {
  get(url: string): Promise<Blob | undefined>
  put(url: string, blob: Blob): Promise<void>
  touch(url: string): Promise<void>
}

type StoredVideo = { url: string, data: ArrayBuffer, touched: number }

/** Dedicated persistent database, independent of deploy-versioned service-worker caches. */
export class IndexedAvatarVideoStorage implements AvatarVideoStorage {
  private async open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('moh-avatar-video-v1', 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore('videos', { keyPath: 'url' }).createIndex('touched', 'touched')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('Avatar storage unavailable.'))
    })
  }

  async get(url: string): Promise<Blob | undefined> {
    const db = await this.open()
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction('videos', 'readwrite')
        const store = tx.objectStore('videos')
        const request = store.get(url)
        let blob: Blob | undefined
        request.onsuccess = () => {
          const row = request.result as StoredVideo | undefined
          if (row?.data?.byteLength && row.data.byteLength <= 512 * 1024) {
            blob = new Blob([row.data], { type: 'video/mp4' })
            store.put({ ...row, touched: Date.now() })
          } else if (row) store.delete(url)
        }
        tx.oncomplete = () => resolve(blob)
        tx.onerror = tx.onabort = () => reject(tx.error)
      })
    } finally { db.close() }
  }

  async touch(url: string): Promise<void> {
    const db = await this.open()
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('videos', 'readwrite')
        const store = tx.objectStore('videos')
        const request = store.get(url)
        request.onsuccess = () => {
          if (request.result) store.put({ ...request.result, touched: Date.now() })
        }
        tx.oncomplete = () => resolve()
        tx.onerror = tx.onabort = () => reject(tx.error)
      })
    } finally { db.close() }
  }

  async put(url: string, blob: Blob): Promise<void> {
    // Keep persistent bytes independent of Blob backing-file handles when updating recency.
    const data = await blob.arrayBuffer()
    const db = await this.open()
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('videos', 'readwrite')
        const store = tx.objectStore('videos')
        store.put({ url, data, touched: Date.now() } satisfies StoredVideo)
        // 256 complete files of at most 512 KiB bound disk use to 128 MiB.
        const count = store.count()
        count.onsuccess = () => {
          let excess = count.result - 256
          if (excess <= 0) return
          const cursor = store.index('touched').openKeyCursor()
          cursor.onsuccess = () => {
            if (!cursor.result || excess <= 0) return
            if (cursor.result.primaryKey !== url) { store.delete(cursor.result.primaryKey); excess-- }
            cursor.result.continue()
          }
        }
        tx.oncomplete = () => resolve()
        tx.onerror = tx.onabort = () => reject(tx.error)
      })
    } finally { db.close() }
  }
}
