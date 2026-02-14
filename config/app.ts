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

  /** Video upload (premium/premium+): max duration (seconds) and file size. */
  video: {
    premium: {
      maxDurationSeconds: 5 * 60, // 5 minutes
      maxBytes: 75 * 1024 * 1024, // 75MB
    },
    premiumPlus: {
      maxDurationSeconds: 15 * 60, // 15 minutes
      maxBytes: 125 * 1024 * 1024, // 125MB
    },
  },
} as const
