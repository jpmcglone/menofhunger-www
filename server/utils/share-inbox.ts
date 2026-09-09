export type ShareInboxFile = {
  name: string
  type: string
  data: string
}

export type ShareInboxEntry = {
  title?: string
  text?: string
  url?: string
  files: ShareInboxFile[]
  expiresAt: number
}

const TTL_MS = 30 * 60 * 1000
const store = new Map<string, ShareInboxEntry>()

function prune() {
  const now = Date.now()
  for (const [id, entry] of store) {
    if (entry.expiresAt <= now) store.delete(id)
  }
}

export function putShareInbox(entry: Omit<ShareInboxEntry, 'expiresAt'>): string {
  prune()
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  store.set(id, { ...entry, expiresAt: Date.now() + TTL_MS })
  return id
}

export function takeShareInbox(id: string): ShareInboxEntry | null {
  prune()
  const entry = store.get(id) ?? null
  if (entry) store.delete(id)
  return entry
}
