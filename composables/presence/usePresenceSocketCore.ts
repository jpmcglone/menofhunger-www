import { io, type Socket } from 'socket.io-client'

const PRESENCE_SOCKET_KEY = 'presence-socket'
const PRESENCE_DISCONNECTED_DUE_TO_IDLE_KEY = 'presence-disconnected-due-to-idle'
const PRESENCE_SOCKET_CONNECTED_KEY = 'presence-socket-connected'
const PRESENCE_SOCKET_CONNECTING_KEY = 'presence-socket-connecting'
const PRESENCE_CONNECTION_BAR_JUST_CONNECTED_KEY = 'presence-connection-bar-just-connected'

/** True between emitLogout() and the resulting disconnect; prevents auto-reconnect after explicit logout. Module-scoped: there is one socket per tab. */
let pendingLogout = false
let serverDisconnectReconnectTimer: ReturnType<typeof setTimeout> | null = null
let connectionBarJustConnectedTimer: ReturnType<typeof setTimeout> | null = null

export type PresenceSocketHooks = {
  /** Register all domain socket.on handlers. Called once per socket creation. */
  registerHandlers: (socket: Socket) => void
  /** Re-emit every live subscription (presence interest, online feed, content rooms). */
  syncSubscriptions: (socket: Socket) => void
  /** Connected (or already-connected socket adopted): seed self-online, mute sounds during backlog sync, etc. */
  onConnected: () => void
  /** Socket dropped: clear presence sets so the UI doesn't show stale "online". */
  onDisconnected: () => void
  /** Explicit disconnect() (logout): additionally drop sticky subscriptions like the online feed. */
  onTeardown: () => void
}

/**
 * Convert the (possibly versioned) API base URL to a bare WebSocket origin.
 *
 * Returns only the protocol + host (e.g. "wss://api.menofhunger.com").
 * The Socket.IO engine path is always passed separately as `/socket.io` and is
 * mounted at the server root, independent of the REST API version prefix (/v1, /v2, ...).
 *
 * This ensures realtime connections continue to work when clients point their
 * REST base URL at a versioned root (the version applies only to HTTP routes).
 */
function apiBaseUrlToWsUrl(apiBaseUrl: string): string {
  try {
    const u = new URL(apiBaseUrl)
    const wsProto = u.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsProto}//${u.host}`
  } catch {
    // Fallback for malformed input (dev, tests, or unusual bases)
    const trimmed = apiBaseUrl.replace(/\/+$/, '').trim()
    if (trimmed.startsWith('https://')) {
      return `wss://${trimmed.slice(8).split('/')[0]}`
    }
    if (trimmed.startsWith('http://')) {
      return `ws://${trimmed.slice(7).split('/')[0]}`
    }
    return trimmed
  }
}

/** Shared handle to the singleton socket (also used by the sibling presence modules). */
export function usePresenceSocketRef() {
  return useState<Socket | null>(PRESENCE_SOCKET_KEY, () => null)
}

/**
 * Owns the single Socket.IO connection: connect/disconnect/reconnect,
 * connection flags, the "reconnecting" banner state, and the post-connect
 * subscription resync. Domain event handlers are injected via hooks.
 */
export function usePresenceSocketCore(hooks: PresenceSocketHooks) {
  const socketRef = usePresenceSocketRef()
  const isSocketConnected = useState(PRESENCE_SOCKET_CONNECTED_KEY, () => false)
  const isSocketConnecting = useState(PRESENCE_SOCKET_CONNECTING_KEY, () => false)
  const disconnectedDueToIdle = useState<boolean>(PRESENCE_DISCONNECTED_DUE_TO_IDLE_KEY, () => false)
  /** Brief "just reconnected" state for connection bar green flash before hide. */
  const connectionBarJustConnected = useState<boolean>(PRESENCE_CONNECTION_BAR_JUST_CONNECTED_KEY, () => false)
  /** True after first successful connect; used to show "disconnected" banner only after a real disconnect (not on initial load). */
  const wasSocketConnectedOnce = useState<boolean>('presence-was-socket-connected-once', () => false)
  /**
   * True when the most recent socket disconnect happened while the page was visible.
   * Only in that case does the user need a "Reconnecting…" banner — if the drop happened
   * in the background (tab hidden / app backgrounded) we reconnect silently.
   */
  const socketDisconnectedWhileVisible = useState<boolean>('presence-socket-disconnected-while-visible', () => false)

  const { apiBaseUrl } = useApiClient()

  /** Resolve when socket is connected, or after timeout. Returns true if connected, false if timed out. */
  function whenSocketConnected(timeoutMs = 10000): Promise<boolean> {
    const socket = socketRef.value
    if (socket?.connected) return Promise.resolve(true)
    if (!socket) return Promise.resolve(false)
    return new Promise((resolve) => {
      const done = (connected: boolean) => {
        clearTimeout(timer)
        socket.off('connect', onConnect)
        resolve(connected)
      }
      const onConnect = () => done(true)
      socket.once('connect', onConnect)
      const timer = setTimeout(() => done(false), timeoutMs)
    })
  }

  function connect() {
    if (!import.meta.client) return
    if (!apiBaseUrl) return
    // If a socket already exists, reuse it instead of creating another one.
    if (isSocketConnecting.value) return
    if (socketRef.value) {
      if (!socketRef.value.connected) {
        isSocketConnecting.value = true
        socketRef.value.connect()
      }
      return
    }

    isSocketConnecting.value = true
    // Socket.IO engine path is intentionally mounted at the server root (/socket.io),
    // not under the REST API version prefix. We therefore always target the bare origin
    // for the WS host and hard-set (or pass) the engine path as '/socket.io'.
    // This is independent of whether clients point their REST base at /v1, /v2, etc.
    const wsUrl = apiBaseUrlToWsUrl(apiBaseUrl)
    const socket = io(wsUrl, {
      path: '/socket.io',
      withCredentials: true,
      query: { client: 'web' },
      transports: ['websocket', 'polling'],
      // Auto-reconnect on network/server drops (best practice)
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    socket.on('presence:idleDisconnected', () => {
      disconnectedDueToIdle.value = true
    })

    hooks.registerHandlers(socket)

    socket.on('connect', () => {
      pendingLogout = false
      if (serverDisconnectReconnectTimer) {
        clearTimeout(serverDisconnectReconnectTimer)
        serverDisconnectReconnectTimer = null
      }
      const isReconnect = wasSocketConnectedOnce.value
      const wasDisconnectedWhileVisible = socketDisconnectedWhileVisible.value
      wasSocketConnectedOnce.value = true
      isSocketConnected.value = true
      isSocketConnecting.value = false
      socketDisconnectedWhileVisible.value = false
      hooks.onConnected()
      // Only flash the "Reconnected." green bar when the banner was actually visible to the user
      // (idle kick, or a disconnect that happened while the page was in the foreground).
      if (disconnectedDueToIdle.value || (isReconnect && wasDisconnectedWhileVisible)) {
        disconnectedDueToIdle.value = false
        connectionBarJustConnected.value = true
        if (connectionBarJustConnectedTimer) clearTimeout(connectionBarJustConnectedTimer)
        connectionBarJustConnectedTimer = setTimeout(() => {
          connectionBarJustConnected.value = false
          connectionBarJustConnectedTimer = null
        }, 1500)
      }
      hooks.syncSubscriptions(socket)
    })

    socket.on('disconnect', (reason: string) => {
      isSocketConnected.value = false
      isSocketConnecting.value = false
      connectionBarJustConnected.value = false
      if (connectionBarJustConnectedTimer) {
        clearTimeout(connectionBarJustConnectedTimer)
        connectionBarJustConnectedTimer = null
      }
      // Only raise the reconnecting banner when the user was actively viewing the app.
      // A background disconnect (tab hidden / app backgrounded) should reconnect silently.
      socketDisconnectedWhileVisible.value =
        typeof document !== 'undefined' && document.visibilityState === 'visible'
      hooks.onDisconnected()
      // For server-initiated disconnects (e.g. idle timeout), Socket.IO does NOT auto-reconnect.
      // Schedule a delayed reconnect unless this was an explicit logout.
      if (reason === 'io server disconnect' && !pendingLogout) {
        serverDisconnectReconnectTimer = setTimeout(() => {
          serverDisconnectReconnectTimer = null
          if (!socketRef.value?.connected && !isSocketConnecting.value) {
            reconnect()
          }
        }, 3000)
      }
    })

    if (socket.connected) {
      wasSocketConnectedOnce.value = true
      isSocketConnected.value = true
      isSocketConnecting.value = false
      hooks.onConnected()
      hooks.syncSubscriptions(socket)
    }

    socketRef.value = socket
  }

  function emitLogout() {
    pendingLogout = true
    const socket = socketRef.value
    if (socket?.connected) {
      socket.emit('presence:logout')
    }
  }

  function disconnect() {
    pendingLogout = false
    if (serverDisconnectReconnectTimer) {
      clearTimeout(serverDisconnectReconnectTimer)
      serverDisconnectReconnectTimer = null
    }
    const socket = socketRef.value
    if (socket) {
      socket.disconnect()
      socketRef.value = null
    }
    wasSocketConnectedOnce.value = false
    isSocketConnecting.value = false
    disconnectedDueToIdle.value = false
    socketDisconnectedWhileVisible.value = false
    connectionBarJustConnected.value = false
    if (connectionBarJustConnectedTimer) {
      clearTimeout(connectionBarJustConnectedTimer)
      connectionBarJustConnectedTimer = null
    }
    hooks.onDisconnected()
    hooks.onTeardown()
  }

  /** Reconnect presence socket (e.g. after being disconnected due to idle). */
  function reconnect() {
    const socket = socketRef.value
    if (socket && !socket.connected) {
      isSocketConnecting.value = true
      socket.connect()
    }
  }

  return {
    socketRef,
    isSocketConnected,
    isSocketConnecting,
    disconnectedDueToIdle,
    connectionBarJustConnected,
    wasSocketConnectedOnce,
    socketDisconnectedWhileVisible,
    whenSocketConnected,
    connect,
    disconnect,
    reconnect,
    emitLogout,
  }
}
