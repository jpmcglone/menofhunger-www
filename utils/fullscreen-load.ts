/**
 * Full-screen loading screen conventions:
 * - WHY: Document the reason in a comment at the usage site (e.g. "waiting for WebSocket so presence is correct")
 * - MIN DISPLAY: 500ms to avoid flicker when load completes quickly
 * - FADE OUT: 200ms leave transition for a smooth dismissal
 */
export const FULLSCREEN_LOAD_MIN_MS = 500
export const FULLSCREEN_LOAD_FADE_MS = 200
