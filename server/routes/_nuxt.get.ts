/**
 * Handle GET /_nuxt (no chunk filename).
 * Return 204 so the dev server doesn't log a request error; nothing serves this path.
 */
export default defineEventHandler((event) => {
  setResponseStatus(event, 204)
  return null
})
