/**
 * Handle GET /_nuxt so it doesn't surface as an unhandled 404.
 * Browsers or tooling sometimes request this; Nuxt serves assets at /_nuxt/* (specific files).
 */
export default defineEventHandler(() => {
  setResponseStatus(204)
  return null
})
