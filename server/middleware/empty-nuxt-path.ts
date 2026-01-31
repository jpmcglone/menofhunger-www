/**
 * Handle GET /_nuxt/ or GET /_nuxt (no filename) so Nitro returns a proper 404
 * instead of an unhandled request error in dev.
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if ((path === '/_nuxt/' || path === '/_nuxt') && getMethod(event) === 'GET') {
    setResponseStatus(event, 404)
    return 'Not Found'
  }
})
