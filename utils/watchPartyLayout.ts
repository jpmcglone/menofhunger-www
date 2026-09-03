/** 16:9 from width, capped so landscape still leaves room for chat. */
export const WATCH_PLAYER_PINNED_HEIGHT =
  'min(56.25vw, calc(100dvh - var(--moh-safe-top, 0px) - 12rem))'

export const WATCH_CHAT_PINNED_TOP =
  `calc(var(--moh-safe-top, 0px) + ${WATCH_PLAYER_PINNED_HEIGHT})`
