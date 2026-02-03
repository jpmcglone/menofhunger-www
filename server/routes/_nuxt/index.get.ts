/**
 * Handle GET /_nuxt/ (trailing slash) so it doesn't surface as an unhandled 404.
 */
export default defineEventHandler(() => {
  setResponseStatus(204)
  return null
})
