/**
 * Handle GET /_nuxt (no chunk filename).
 * Prevents Nitro from logging these as unhandled 404s.
 */
export default defineEventHandler((event) => {
  setResponseStatus(event, 404)
  return 'Not Found'
})
