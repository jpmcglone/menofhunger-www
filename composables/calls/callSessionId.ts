let tabSessionId: string | null = null

/**
 * One id per tab lifetime, sent on `calls:start` / `calls:join`. A socket reconnect from this
 * tab keeps it (peers keep the live connection); another tab or device gets its own, which tells
 * peers to rebuild instead of renegotiating a dead connection.
 */
export function tabCallSessionId(): string {
  if (!tabSessionId) {
    const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    tabSessionId = `web-${random.replace(/[^A-Za-z0-9]/g, '').slice(0, 40)}`
  }
  return tabSessionId
}
