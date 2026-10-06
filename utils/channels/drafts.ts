import { toRaw } from 'vue'
import type { GiphyItem } from '~/types/api'

/** IndexedDB structured clone rejects Vue reactive proxies; unwrap plain data, keep Files and Blobs. */
function unwrap<T>(value: T): T {
  const raw = toRaw(value) as unknown
  if (Array.isArray(raw)) return raw.map(unwrap) as T
  if (raw && typeof raw === 'object' && Object.getPrototypeOf(raw) === Object.prototype) {
    return Object.fromEntries(Object.entries(raw).map(([key, item]) => [key, unwrap(item)])) as T
  }
  return raw as T
}
export const CHANNEL_MAX_ATTACHMENTS = 4
/** `file` is the pre-multi-attachment shape; drafts saved by older tabs still load. */
export type ChannelDraft = { text: string; files?: File[]; file?: File; gif?: GiphyItem; revision: string; requestId: string }
export type DraftDestination = { identity: string; surface: string; destination: string; root?: string }
export const destinationDraftKey = (key: DraftDestination) => JSON.stringify([key.identity, key.surface, key.destination, key.root ?? ''])
let opening: Promise<IDBDatabase> | undefined
function database() {
  if (!opening) opening = new Promise((resolve, reject) => {
    const request = indexedDB.open('moh-destination-drafts', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('drafts')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => { opening = undefined; reject(request.error) }
  })
  return opening
}
export async function loadLocalDraft<T>(key: string): Promise<T | undefined> {
  const db = await database()
  return new Promise((resolve, reject) => {
    const request = db.transaction('drafts').objectStore('drafts').get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error)
  })
}
export const loadChannelDraft = (key: string) => loadLocalDraft<ChannelDraft>(key)
export async function saveLocalDraft<T>(key: string, value: T | null) {
  const db = await database()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('drafts', 'readwrite')
    if (value === null) transaction.objectStore('drafts').delete(key)
    else transaction.objectStore('drafts').put(unwrap(value), key)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}
export const saveChannelDraft = (key: string, value: ChannelDraft) => saveLocalDraft(key, !value.text && !value.files?.length && !value.file && !value.gif ? null : value)
export async function clearChannelDraft(key: string, revision: string) {
  const db = await database()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('drafts', 'readwrite')
    const store = transaction.objectStore('drafts')
    const request = store.get(key)
    request.onsuccess = () => { if ((request.result as ChannelDraft | undefined)?.revision === revision) store.delete(key) }
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}
