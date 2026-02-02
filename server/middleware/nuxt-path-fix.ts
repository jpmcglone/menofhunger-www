/**
 * Handle GET /_nuxt/ (trailing slash) so it doesn't surface as an unhandled 404.
 * Browsers or tooling sometimes request this; Nuxt serves assets at /_nuxt/* (no trailing slash).
 * Return a value so the response is sent and the chain stops (otherwise the request continues and 404s).
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if ((path === '/_nuxt/' || path === '/_nuxt') && event.method === 'GET') {
    setResponseStatus(event, 204)
    return null
  }
})
