/**
 * Handle GET /_nuxt/ (trailing slash, no chunk filename).
 */
export default defineEventHandler((event) => {
  setResponseStatus(event, 404)
  return 'Not Found'
})
