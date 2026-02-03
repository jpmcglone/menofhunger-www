/**
 * App-wide tunables (no DB). Tweak timing, limits, and UI behavior here.
 * Idle = no activity ping for presenceIdleAfterMs; server marks idle after 3 min (aligned with API).
 */
export const appConfig = {
  /** Presence: after this many ms with no interaction, client sends presence:idle (server also marks idle after 3 min). */
  presenceIdleAfterMs: 3 * 60 * 1000,

  /** Throttle activity pings: send presence:active at most this often (ms), unless clearing idle. */
  presenceActivityThrottleMs: 30 * 1000,

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
