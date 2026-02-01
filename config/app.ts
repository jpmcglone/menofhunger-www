/**
 * App-wide tunables (no DB). Tweak timing, limits, and UI behavior here.
 * Idle = hasn't interacted with anything (mouse, key, scroll, touch, navigation) for the given time.
 */
export const appConfig = {
  /** Presence: after this many ms with no interaction, user is marked idle (still online, show clock). */
  presenceIdleAfterMs: 5 * 60 * 1000,

  /**
   * Presence: how long to show "recently disconnected" (red dot) after disconnect.
   * Should align with API presenceRecentDisconnectMinutes; used client-side for timer/display.
   */
  presenceRecentDisconnectMs: 6 * 60 * 1000,

  /** Max user IDs to subscribe to per socket (presence interest cap). */
  presenceMaxInterest: 100,

  /** Full-screen load: min display time (ms) to avoid flicker; fade-out duration (ms). */
  fullscreenLoad: {
    minMs: 500,
    fadeMs: 200,
  },

  /** Video upload (premium): max duration (seconds), resolution (1080p), and file size. */
  video: {
    maxDurationSeconds: 5 * 60, // 5 minutes
    maxWidth: 1920,
    maxHeight: 1080,
    maxBytes: 25 * 1024 * 1024,
  },
} as const
