import { vi } from 'vitest'

type Handler = (...args: unknown[]) => void

/**
 * happy-dom cannot close engine.io's real `ws` WebSocket (`Illegal invocation`).
 * Nuxt unit tests boot client plugins that call `usePresence()` → `io()`, so the
 * transport must be inert. Browser/Playwright checks cover a live socket.
 */
export function io(_url?: string, _opts?: Record<string, unknown>) {
  const handlers = new Map<string, Set<Handler>>()
  const socket = {
    connected: false,
    disconnected: true,
    id: 'test-socket',
    io: { engine: { transport: { name: 'websocket' } } },
    on(event: string, cb: Handler) {
      let set = handlers.get(event)
      if (!set) {
        set = new Set()
        handlers.set(event, set)
      }
      set.add(cb)
      return socket
    },
    once(event: string, cb: Handler) {
      const wrapped: Handler = (...args) => {
        socket.off(event, wrapped)
        cb(...args)
      }
      return socket.on(event, wrapped)
    },
    off(event: string, cb?: Handler) {
      if (!cb) handlers.delete(event)
      else handlers.get(event)?.delete(cb)
      return socket
    },
    emit: vi.fn(() => socket),
    connect() {
      socket.connected = true
      socket.disconnected = false
      return socket
    },
    disconnect() {
      socket.connected = false
      socket.disconnected = true
      return socket
    },
    close() {
      return socket.disconnect()
    },
    removeAllListeners() {
      handlers.clear()
      return socket
    },
  }
  return socket
}

export default { io }
