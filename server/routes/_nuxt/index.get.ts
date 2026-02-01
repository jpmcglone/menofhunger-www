/**
 * Handle GET /_nuxt/ (trailing slash, no chunk filename).
 * Return 204 so the dev server doesn't log a request error.
 */
export default defineEventHandler((event) => {
  setResponseStatus(event, 204)
  return null
})
