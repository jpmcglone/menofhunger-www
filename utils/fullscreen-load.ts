import { appConfig } from '~/config/app'

/**
 * Full-screen loading conventions. Values live in config/app.ts.
 * Document the reason at the usage site (e.g. "waiting for WebSocket so presence is correct").
 */
export const FULLSCREEN_LOAD_MIN_MS = appConfig.fullscreenLoad.minMs
export const FULLSCREEN_LOAD_FADE_MS = appConfig.fullscreenLoad.fadeMs
