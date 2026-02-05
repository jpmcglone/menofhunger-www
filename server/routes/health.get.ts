/**
 * Render (and other platforms) often use a simple HTTP health check endpoint.
 * Keep this fast and dependency-free.
 */
export default defineEventHandler(() => {
  return { ok: true }
})

