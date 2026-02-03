/**
 * Handle GET /_nuxt/ (trailing slash) and GET /_nuxt so they don't surface as unhandled 404.
 * Browsers or tooling sometimes request these; Nuxt serves assets at /_nuxt/<filename>.
 */
export default defineEventHandler(() => {
  setResponseStatus(204)
  return null
})
